import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'notebooklm-clone';
  pdfSrc?: string | Uint8Array;
  loadingPdf: boolean = false;

  onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];

  if (file) {
    this.loadingPdf = true;

    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      this.pdfSrc = new Uint8Array(arrayBuffer);
      this.loadingPdf = false;  // ✅ Stop loading when done
    };

    reader.readAsArrayBuffer(file);
  }
}
}
