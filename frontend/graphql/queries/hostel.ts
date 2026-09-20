import { gql } from "@apollo/client";

export const GET_HOSTEL_BLOCKS = gql`
  query GetHostelBlocks {
    hostelBlocks {
      id name type floors
    }
  }
`;

export const GET_HOSTEL_ROOMS = gql`
  query GetHostelRooms($blockId: String) {
    hostelRooms(blockId: $blockId) {
      id blockId roomNumber floor capacity occupied roomType status monthlyFee
      roomClassId rateType rateAmount effectiveRateType semesterRate annualRate monthlyRate
      roomClass { id name description rateType rateAmount semesterRate annualRate monthlyRate }
      block { id name type floors }
    }
  }
`;

export const GET_ROOM_CLASSES = gql`
  query GetRoomClasses {
    roomClasses {
      id name description rateType rateAmount semesterRate annualRate monthlyRate
    }
  }
`;

export const GET_HOSTEL_ALLOCATIONS = gql`
  query GetHostelAllocations($status: String) {
    hostelAllocations(status: $status) {
      id studentId roomId bedNumber allocDate vacateDate status
      student { id rollNumber gender user { id name } }
      room { id roomNumber floor capacity roomType status monthlyFee block { id name type } }
    }
  }
`;
