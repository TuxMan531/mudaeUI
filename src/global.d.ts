import type { MudaeBridge } from './shared/types';

declare global {
  interface Window {
    mudae: MudaeBridge;
  }
}

export {};
