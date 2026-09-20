import { gql } from "@apollo/client";

export const CREATE_HOSTEL_BLOCK = gql`
  mutation CreateHostelBlock($input: CreateHostelBlockInput!) {
    createHostelBlock(input: $input) {
      id name type floors
    }
  }
`;

export const BULK_DELETE_HOSTEL_BLOCKS = gql`
  mutation BulkDeleteHostelBlocks($ids: [ID!]!) {
    bulkDeleteHostelBlocks(ids: $ids)
  }
`;

export const CREATE_HOSTEL_ROOM = gql`
  mutation CreateHostelRoom($input: CreateHostelRoomInput!) {
    createHostelRoom(input: $input) {
      id blockId roomNumber floor capacity occupied roomType status monthlyFee
      roomClassId effectiveRateType semesterRate annualRate monthlyRate
      roomClass { id name }
      block { id name }
    }
  }
`;

export const UPDATE_HOSTEL_ROOM = gql`
  mutation UpdateHostelRoom($id: ID!, $input: UpdateHostelRoomInput!) {
    updateHostelRoom(id: $id, input: $input) {
      id blockId roomNumber floor capacity occupied roomType status monthlyFee
      roomClassId effectiveRateType semesterRate annualRate monthlyRate
      roomClass { id name }
      block { id name }
    }
  }
`;

export const ALLOCATE_HOSTEL_ROOM = gql`
  mutation AllocateHostelRoom($input: AllocateHostelRoomInput!) {
    allocateHostelRoom(input: $input) {
      id studentId roomId bedNumber allocDate vacateDate status
      student { id rollNumber gender user { id name } }
      room { id roomNumber block { id name type } }
    }
  }
`;

export const VACATE_HOSTEL_ROOM = gql`
  mutation VacateHostelRoom($id: ID!, $input: VacateHostelRoomInput!) {
    vacateHostelRoom(id: $id, input: $input) {
      id studentId roomId allocDate vacateDate status
    }
  }
`;

export const CREATE_ROOM_CLASS = gql`
  mutation CreateRoomClass($input: CreateRoomClassInput!) {
    createRoomClass(input: $input) {
      id name description rateType rateAmount semesterRate annualRate monthlyRate
    }
  }
`;

export const UPDATE_ROOM_CLASS = gql`
  mutation UpdateRoomClass($id: ID!, $input: UpdateRoomClassInput!) {
    updateRoomClass(id: $id, input: $input) {
      id name description rateType rateAmount semesterRate annualRate monthlyRate
    }
  }
`;

export const DELETE_ROOM_CLASS = gql`
  mutation DeleteRoomClass($id: ID!) {
    deleteRoomClass(id: $id)
  }
`;

export const BULK_DELETE_HOSTEL_ROOMS = gql`
  mutation BulkDeleteHostelRooms($ids: [ID!]!) {
    bulkDeleteHostelRooms(ids: $ids)
  }
`;

export const BULK_DELETE_HOSTEL_ALLOCATIONS = gql`
  mutation BulkDeleteHostelAllocations($ids: [ID!]!) {
    bulkDeleteHostelAllocations(ids: $ids)
  }
`;

export const BULK_DELETE_ROOM_CLASSES = gql`
  mutation BulkDeleteRoomClasses($ids: [ID!]!) {
    bulkDeleteRoomClasses(ids: $ids)
  }
`;
