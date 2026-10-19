import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
	getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
	const values = new Map<string, string>();
	const storage: Storage = {
		get length() { return values.size; },
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => { values.set(String(key), String(value)); },
		removeItem: (key) => { values.delete(key); },
		key: (index) => Array.from(values.keys())[index] ?? null
	};
	vi.stubGlobal('localStorage', storage);
}