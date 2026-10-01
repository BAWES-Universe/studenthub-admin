import { NgModule, APP_INITIALIZER, Injector, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { AuthModule } from '@auth0/auth0-angular';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
// import { IonicStorageModule } from '@ionic/storage';
import { CalendarModule } from 'ion2-calendar';
import { ServiceWorkerModule, SwUpdate } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AuthService } from './providers/auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BankFormPageModule } from './pages/logged-in/bank/bank-form/bank-form.module';
import { CompanyFormPageModule } from './pages/logged-in/company/company-form/company-form.module';
import { StaffFormPageModule } from './pages/logged-in/staff/staff-form/staff-form.module';
import { AdminFormPageModule } from './pages/logged-in/admin/admin-form/admin-form.module';
import { UniversityFormPageModule } from './pages/logged-in/university/university-form/university-form.module';
import { UpdateAlertModule } from './components/update-alert/update-alert.module';
import { SentryErrorhandlerService } from './providers/sentry.errorhandler.service';
import { UploadFilePageModule } from './pages/logged-in/company/upload-file/upload-file.module';
import { BrandFormPageModule } from './pages/logged-in/company/brand-form/brand-form.module';
import { CompanyContactFormPageModule } from './pages/logged-in/company/company-contact-form/company-contact-form.module';
import { NoItemsModule } from './components/no-items/no-items.module';
import {SelectiveLoadingStrategy} from './util/SelectiveLoadingStrategy';
import {CountryFormPageModule} from './pages/logged-in/country/country-form/country-form.module';
import {InspectorFormPageModule} from './pages/logged-in/inspector/inspector-form/inspector-form.module';
import { ModalPopPageModule } from './pages/logged-in/modal-pop/modal-pop.module';
import { RequestChecklistFormPageModule } from './pages/logged-in/requests/request-checklist/request-checklist-form/request-checklist-form.module';
import { ExpenseFormPageModule } from './pages/logged-in/expense/expense-form/expense-form.module';
import {CompanyPageModule} from './pages/logged-in/picker/company/company.module';
import {CandidateModule} from './components/candidate/candidate.module';
import {CandidateWorkHistoryModule} from './components/candidate-work-history/candidate-work-history.module';
import {RequestModule} from './components/request/request.module';
import {StaffPageModule} from "./pages/logged-in/picker/staff/staff.module";
import { DailyStandupQuestionFormPageModule } from './pages/logged-in/daily-standup/daily-standup-question/daily-standup-question-form/daily-standup-question-form.module';
import { CompanyNoteFormPageModule } from './pages/logged-in/company/company-note-form/company-note-form.module';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { IonicStorageModule } from '@ionic/storage-angular';
import {FulltimerModule} from "./components/fulltimer/fulltimer.module";
import {DailyStandupAnswerViewPageModule} from "./pages/logged-in/daily-standup/daily-standup-answer/daily-standup-answer-view/daily-standup-answer-view.module";
import {CanEvalQuesDeptFormPageModule} from "./pages/logged-in/candidate/evaluation/can-eval-ques-dept-form/can-eval-ques-dept-form.module";
import {EvaluationReportViewPageModule} from "./pages/logged-in/candidate/evaluation/evaluation-report-view/evaluation-report-view.module";
import { CandidatePageModule } from "./pages/logged-in/picker/candidate/candidate.module";
import { WebhookFormPageModule } from './pages/logged-in/webhook/webhook-form/webhook-form.module';
import { EmailCampaignFormPageModule } from './pages/logged-in/email-campaign/email-campaign-form/email-campaign-form.module';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { BlockedIpFormPageModule } from './pages/logged-in/blocked-ip/blocked-ip-form/blocked-ip-form.module';
import { CurrencyFormPageModule } from './pages/logged-in/currency/currency-form/currency-form.module';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-KW';
import { MajorFormPageModule } from './pages/logged-in/major/major-form/major-form.module';
import { DegreeGroupFormPageModule } from './pages/logged-in/degree-group/degree-group-form/degree-group-form.module';
import { DegreeFormPageModule } from './pages/logged-in/degree/degree-form/degree-form.module';
export function startupServiceFactory(authService: AuthService) {
  return () => authService.load();
}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/');
}

declare global {
  interface Window { analytics: any; }
}

@NgModule({
  declarations: [
    AppComponent
  ],
  entryComponents: [],
  imports: [
    AuthModule.forRoot({
      domain: 'bawes.us.auth0.com',
      clientId: 'sDIOpy1be7Y59ocKoXxHVL5euFNdJN3e'
    }),
    CKEditorModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    BrowserModule,
    CalendarModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot({
      name: '__payroll_admin'
    }),
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.serviceWorker,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    BankFormPageModule,
    ExpenseFormPageModule,
    CompanyFormPageModule,
    StaffFormPageModule,
    AdminFormPageModule,
    UniversityFormPageModule,
    MajorFormPageModule,
    DegreeGroupFormPageModule,
    DegreeFormPageModule,
    WebhookFormPageModule,
    UpdateAlertModule,
    UploadFilePageModule,
    BrandFormPageModule,
    CompanyContactFormPageModule,
    NoItemsModule,
    CountryFormPageModule,
    InspectorFormPageModule,
    CompanyNoteFormPageModule,
    ModalPopPageModule,
    RequestChecklistFormPageModule,
    EmailCampaignFormPageModule,
    CompanyPageModule,
    CandidateModule,
    CandidateWorkHistoryModule,
    RequestModule,
    StaffPageModule,
    DailyStandupQuestionFormPageModule,
    DailyStandupAnswerViewPageModule,
    CanEvalQuesDeptFormPageModule,
    FulltimerModule,
    EvaluationReportViewPageModule,
    CandidatePageModule,
    BlockedIpFormPageModule,
    CurrencyFormPageModule,
    EditorModule
  ],
  providers: [
    {
      // Provider for APP_INITIALIZER
      provide: APP_INITIALIZER,
      useFactory: startupServiceFactory,
      deps: [AuthService],
      multi: true
    },
    File,
    NativeStorage,
    SwUpdate,
    SelectiveLoadingStrategy,
    { provide: TINYMCE_SCRIPT_SRC, useValue: 'tinymce/tinymce.min.js' },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: SentryErrorhandlerService }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  static injector: Injector;

  constructor(public injector: Injector) {
    AppModule.injector = injector;
    registerLocaleData(localeAr, 'ar');
  }
}

