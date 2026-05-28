import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { EventsSheetService } from './events-sheet.service';

describe('EventsSheetService', () => {
  let service: EventsSheetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EventsSheetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('parses well-formed CSV rows into XeicEvent', (done) => {
    const csv = [
      'title,date,time,location,type,difficulty,tags,imageurl,distance,elevationgain,description,registrationurl',
      'Quedada,01/06/2026,19:30,Plaça,training,Iniciació,Trail|Nit,assets/x.jpg,10km,200m+,Una descripció,',
    ].join('\n');

    service.getEvents().subscribe((events) => {
      expect(events.length).toBe(1);
      const e = events[0];
      expect(e.title).toBe('Quedada');
      expect(e.type).toBe('training');
      expect(e.difficulty).toBe('Iniciació');
      expect(e.tags).toEqual(['Trail', 'Nit']);
      expect(e.imageUrl).toBe('assets/x.jpg');
      expect(e.distance).toBe('10km');
      expect(e.elevationGain).toBe('200m+');
      expect(e.description).toBe('Una descripció');
      expect(e.registrationUrl).toBeUndefined();
      expect(e.date.getFullYear()).toBe(2026);
      expect(e.date.getMonth()).toBe(5);
      expect(e.date.getDate()).toBe(1);
      done();
    });

    httpMock.expectOne(() => true).flush(csv);
  });

  it('skips rows missing required fields', (done) => {
    const csv = [
      'title,date,time,location,type,difficulty,tags,imageurl',
      ',01/06/2026,19:30,X,training,Iniciació,,assets/x.jpg', 
      'OK,01/06/2026,19:30,X,training,Iniciació,,assets/x.jpg',
      'NoDate,,19:30,X,training,Iniciació,,assets/x.jpg', 
      'NoImg,01/06/2026,19:30,X,training,Iniciació,,', 
    ].join('\n');

    service.getEvents().subscribe((events) => {
      expect(events.map((e) => e.title)).toEqual(['OK']);
      done();
    });

    httpMock.expectOne(() => true).flush(csv);
  });

  it('defaults type and difficulty when values are not in the whitelist', (done) => {
    const csv = [
      'title,date,time,location,type,difficulty,tags,imageurl',
      'X,01/06/2026,10:00,P,nonsense,??,Tag,assets/x.jpg',
    ].join('\n');

    service.getEvents().subscribe((events) => {
      expect(events[0].type).toBe('social');
      expect(events[0].difficulty).toBe('Iniciació');
      done();
    });

    httpMock.expectOne(() => true).flush(csv);
  });

  it('returns [] when the request errors', (done) => {
    service.getEvents().subscribe((events) => {
      expect(events).toEqual([]);
      done();
    });
    httpMock
      .expectOne(() => true)
      .error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
  });

  it('handles quoted fields with embedded commas', (done) => {
    const csv = [
      'title,date,time,location,type,difficulty,tags,imageurl,distance,elevationgain,description,registrationurl',
      '"Hello, World",01/06/2026,10:00,"Plaça, La Sénia",training,Iniciació,Tag,assets/x.jpg,,,"d,e,f",',
    ].join('\n');

    service.getEvents().subscribe((events) => {
      expect(events[0].title).toBe('Hello, World');
      expect(events[0].location).toBe('Plaça, La Sénia');
      expect(events[0].description).toBe('d,e,f');
      done();
    });

    httpMock.expectOne(() => true).flush(csv);
  });
});
