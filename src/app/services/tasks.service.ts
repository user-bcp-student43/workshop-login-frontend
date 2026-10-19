import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { Task } from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TasksService {
  async getTasks(token: string, username: string): Promise<Task[]> {
    const response = await axios.get<Task[]>(environment.tasksUrl + '?owner=' + username, {
      headers: { Authorization: 'Bearer ' + token }
    });
    return response.data;
  }
}