import { Timestamp } from 'firebase/firestore';

export enum VehicleStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  ARCHIVED = 'archived',
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  vin: string;
  mileage: number;
  dailyRate: number;
  hourlyRate?: number;
  images: string[];
  location?: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
  };
  fuelLevel?: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface DriverLicense {
  number: string;
  expiry: Timestamp | string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
  birthday: Timestamp | string;
  driverLicense: DriverLicense;
  tags: string[];
  status?: string;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
  pickupDate?: string;
  pickupTime?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  amountPaid?: number;
  amountDue?: number;
  assignedVehicle?: string;
  paymentStatus?: 'Paid' | 'Unpaid';
}

export enum ReservationStatus {
  QUOTE = 'quote',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Reservation {
  id: string;
  customerId: string;
  vehicleId: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  status: ReservationStatus;
  totalAmount: number;
  depositStatus: 'held' | 'released' | 'claimed';
}

export interface Incident {
  id: string;
  reservationId: string;
  type: string;
  amount: number;
  evidence: string[];
  description: string;
  timestamp: Timestamp | string;
}
