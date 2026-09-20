// Single shared form state used by the block / room / class / allocation
// modals. All values are kept as strings (mirroring the inputs) and parsed
// on submit.
export interface HostelForm {
  name: string;
  type: string;
  floors: string;
  blockId: string;
  roomNumber: string;
  floor: string;
  capacity: string;
  roomType: string;
  monthlyFee: string;
  roomClassId: string;
  rateType: string;
  rateAmount: string;
  roomId: string;
  allocDate: string;
  className: string;
  classDescription: string;
  classRateType: string;
  classRateAmount: string;
}

// Room create/update input shape (camelCase, matching the GraphQL schema).
export interface RoomInput {
  blockId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  roomType: string;
  monthlyFee: number;
  roomClassId: string;
  rateType: string;
  rateAmount: number;
}
