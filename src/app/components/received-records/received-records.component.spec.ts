import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceivedRecordsComponent } from './received-records.component';

describe('ReceivedRecordsComponent', () => {
  let component: ReceivedRecordsComponent;
  let fixture: ComponentFixture<ReceivedRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceivedRecordsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceivedRecordsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
