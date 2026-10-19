import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionUser } from '../models/auth.models';
import { Task } from '../models/task.models';
import { AUTH_ROUTES } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { selectVisibleTasks } from '../utils/task-selection';
import { userFacingError } from '../utils/user-facing-error';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly tasksService = inject(TasksService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: SessionUser = {};
  loading = true;
  error = '';

  statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const token = this.session.getToken();
    this.user = this.session.getUser();
    if (!token) {
      await this.router.navigate([AUTH_ROUTES.login]);
      return;
    }
    try {
      const tasks = await this.tasksService.getTasks(token, this.user.username || '');
      const visibleTasks = selectVisibleTasks(tasks);
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = userFacingError(error, 'tasks');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clear();
    await this.router.navigate([AUTH_ROUTES.login]);
  }
}
