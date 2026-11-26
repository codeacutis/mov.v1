import { Module } from '@nestjs/common';
import { CompanionsController } from './companions.controller';
import { CompanionsService } from './companions.service';
import { TripStopsController } from './trip-stops.controller';
import { TripStopsService } from './trip-stops.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PatientTripsController } from './patient-trips.controller';
import { PatientTripsService } from './patient-trips.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [
    TripsController,
    TripStopsController,
    CompanionsController,
    PatientTripsController,
    AnalyticsController,
  ],
  providers: [
    TripsService,
    TripStopsService,
    CompanionsService,
    PatientTripsService,
    AnalyticsService,
  ],
  exports: [TripsService, PatientTripsService],
})
export class TripsModule {}
