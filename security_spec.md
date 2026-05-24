# Security Specification: Philly Rental System

## 1. Data Invariants
- **Vehicles:** 
  - `status` MUST be one of: `available`, `rented`, `maintenance`, `archived`.
  - `plateNumber`, `make`, `model` are immutable after creation.
  - `location` must contain `lat`, `lng`, `speed`, and `heading` as numbers.
- **Customers:**
  - PII (email, phone, address, driverLicense) is restricted to the owner of the document or an admin.
  - `tags` (e.g., 'VIP') can ONLY be modified by an admin.
- **Reservations:**
  - `customerId` must match the authenticated user's UID.
  - `startDate` must be <= `endDate`.
  - Once `status` is `completed` or `cancelled`, the document is locked (immutable) for non-admins.
- **Incidents:**
  - Must refer to a valid `reservationId`.
  - `amount` must be a positive number.

## 2. The "Dirty Dozen" Payloads (Deny Cases)

### Identity & Spoofing
1. **Ghost Identity:** User `A` tries to create a `Customer` document with `id` of user `B`.
2. **Elevated Status:** User tries to create a `Customer` with `tags: ['VIP', 'Blacklisted']`.
3. **Owner Stealing:** User tries to update `customerId` on a `Reservation` to point to a different user.

### Integrity & Schema
4. **ID Poisoning:** Create a vehicle with a 1.5MB document ID string.
5. **Type Poisoning:** Update `dailyRate` from a number to a string `"free"`.
6. **Shadow Fields:** Update a vehicle with an extra field `isHacked: true`.
7. **Immutable Breach:** Attempt to change the `vin` of an existing vehicle.

### Relational & State
8. **Orphaned Reservation:** Create a `Reservation` with a `vehicleId` that does not exist in the `/vehicles` collection.
9. **Temporal Paradox:** Create a `Reservation` where `endDate` is before `startDate`.
10. **Terminal Bypass:** Update a `completed` reservation's `totalAmount`.
11. **Unauthorized Incident:** Create an `Incident` for a `reservationId` that belongs to another user.

### Resource Exhaustion
12. **Array Bombing:** Update a vehicle's `images` array with 10,000 URLs to hit document size limits.

## 3. Test Runner Plan
We will use a simulated environment to verify that all the above "Dirty Dozen" payloads return `PERMISSION_DENIED`.
