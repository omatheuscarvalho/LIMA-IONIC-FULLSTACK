import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare var cv: any;

@Injectable({
  providedIn: 'root'
})
export class OpenCvLoaderService {
  private readonly scriptUrl = 'assets/opencv.js';
  private readonly timeoutMs = 60_000;

  private readySubject = new BehaviorSubject<boolean>(false);
  /** Emite true quando o runtime WASM do OpenCV está pronto para uso. */
  readonly ready$ = this.readySubject.asObservable();

  private loading: Promise<void> | null = null;

  constructor(private zone: NgZone) { }

  get isReady(): boolean {
    return this.readySubject.value;
  }

  /** Dispara o carregamento em background, sem aguardar. */
  preload(): void {
    this.load().catch(err => console.warn('[OpenCV] Falha no preload:', err));
  }

  /** Garante que o OpenCV está carregado e inicializado. Idempotente. */
  load(): Promise<void> {
    if (this.readySubject.value) {
      return Promise.resolve();
    }

    if (!this.loading) {
      this.loading = this.zone
        .runOutsideAngular(() => this.carregar())
        .catch(err => {
          this.loading = null; // permite nova tentativa
          throw err;
        });
    }
    return this.loading;
  }

  private carregar(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let script: HTMLScriptElement | null = null;

      const timer = setTimeout(() => {
        script?.remove();
        reject(new Error('Tempo esgotado ao inicializar o OpenCV.js.'));
      }, this.timeoutMs);

      const finalizar = () => {
        clearTimeout(timer);
        if (typeof cv.imread !== 'function') {
          reject(new Error('OpenCV.js inicializou sem a API esperada (cv.imread).'));
          return;
        }
        this.zone.run(() => this.readySubject.next(true));
        resolve();
      };

      const aguardarRuntime = () => {
        // ATENÇÃO: nunca usar `await cv` nem `resolve(cv)`. Este build expõe
        // Module["then"] devolvendo o próprio módulo (também thenable), o que
        // gera recursão infinita na resolução da Promise.
        if (typeof cv.then === 'function') {
          cv.then(() => finalizar());
        } else {
          finalizar();
        }
      };

      // Já injetado (ex.: resquício de angular.json "scripts" ou HMR)
      if (typeof cv !== 'undefined') {
        aguardarRuntime();
        return;
      }

      script = document.createElement('script');
      script.src = this.scriptUrl; // relativo ao <base href="/">
      script.async = true;
      script.onload = () => aguardarRuntime();
      script.onerror = () => {
        clearTimeout(timer);
        script?.remove();
        reject(new Error(`Falha ao carregar ${this.scriptUrl}.`));
      };
      document.head.appendChild(script);
    });
  }
}