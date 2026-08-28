import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settings } from 'ionicons/icons';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButton,
    IonButtons, 
    IonBackButton, 
    IonIcon,
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardContent
  ]
})
export class HelpPage implements OnInit {

  constructor(private themeService: ThemeService) {
    addIcons({ settings });
  }

  ngOnInit() {
  }

  openAccessibilitySettings() {
    this.themeService.openFontSettings();
  }

}