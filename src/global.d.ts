import type { MudaeBridge } from './shared/types';

declare global {
  interface Window {
    mudae: MudaeBridge;
  }

  // Electron <webview> element used to embed Discord.
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
        Partial<{ src: string; partition: string; useragent: string; allowpopups: string; nodeintegration: string }>;
    }
  }
}

// Forge externals plugin ships no types.
declare module '@timfish/forge-externals-plugin';

export {};
