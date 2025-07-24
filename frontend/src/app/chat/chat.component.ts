import { Component } from '@angular/core';
import { ChatService } from '../chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  userInput : string = '';
  messages: { sender: 'User' | 'Bot'; text: string }[] = [];
  loading = false;

  constructor(private chatService: ChatService) {}

  sendMessage(){
    if (!this.userInput.trim()) return; //emprty spaces
    this.messages.push({ sender: 'User', text: this.userInput });
    const input = this.userInput;
    this.userInput = '';

    // setTimeout(() => {
    //   this.messages.push({ sender: 'Bot', text: `You said: "${input}" ` });
    // }, 1000);

    this.chatService.sendMessage(input).subscribe({
      next: (res) => {
        this.messages.push({ sender: 'Bot', text: res.reply });
        this.loading = false;
      },
      error: (err) => {
        this.messages.push({ sender: 'Bot', text: '⚠️ Failed to get response.' });
        this.loading = false;
      }
    });

  }
}
