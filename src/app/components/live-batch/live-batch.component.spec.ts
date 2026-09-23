import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveBatch } from './live-batch';

describe('LiveBatch', () => {
  let component: LiveBatch;
  let fixture: ComponentFixture<LiveBatch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveBatch],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveBatch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
