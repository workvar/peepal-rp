import { gql } from "@apollo/client";

// See queries/transport.ts for why fields are aliased to snake_case. The
// fulfilled reducers in transportSlice push these mutation results straight
// into Redux state, which the page reads in snake_case — so the returned
// selections must be aliased too, or a freshly created/edited row renders
// blank until the next refetch.
export const CREATE_TRANSPORT_ROUTE = gql`
  mutation CreateTransportRoute($input: CreateTransportRouteInput!) {
    createTransportRoute(input: $input) {
      id
      route_name: routeName
      start_point: startPoint
      end_point: endPoint
      stops
      distance
    }
  }
`;

export const UPDATE_TRANSPORT_ROUTE = gql`
  mutation UpdateTransportRoute($id: ID!, $input: UpdateTransportRouteInput!) {
    updateTransportRoute(id: $id, input: $input) {
      id
      route_name: routeName
      start_point: startPoint
      end_point: endPoint
      stops
      distance
    }
  }
`;

export const DELETE_TRANSPORT_ROUTE = gql`
  mutation DeleteTransportRoute($id: ID!) {
    deleteTransportRoute(id: $id)
  }
`;

export const CREATE_TRANSPORT_VEHICLE = gql`
  mutation CreateTransportVehicle($input: CreateTransportVehicleInput!) {
    createTransportVehicle(input: $input) {
      id
      vehicle_number: vehicleNumber
      vehicle_type: vehicleType
      capacity
      driver_name: driverName
      driver_phone: driverPhone
      route_id: routeId
      status
      route { id route_name: routeName }
    }
  }
`;

export const UPDATE_TRANSPORT_VEHICLE = gql`
  mutation UpdateTransportVehicle($id: ID!, $input: UpdateTransportVehicleInput!) {
    updateTransportVehicle(id: $id, input: $input) {
      id
      vehicle_number: vehicleNumber
      vehicle_type: vehicleType
      capacity
      driver_name: driverName
      driver_phone: driverPhone
      route_id: routeId
      status
      route { id route_name: routeName }
    }
  }
`;

export const DELETE_TRANSPORT_VEHICLE = gql`
  mutation DeleteTransportVehicle($id: ID!) {
    deleteTransportVehicle(id: $id)
  }
`;

export const ALLOCATE_TRANSPORT_VEHICLE = gql`
  mutation AllocateTransportVehicle($input: AllocateTransportInput!) {
    allocateTransportVehicle(input: $input) {
      id
      alloc_type: allocType
      student_id: studentId
      employee_id: employeeId
      vehicle_id: vehicleId
      pickup_stop: pickupStop
      start_date: startDate
      end_date: endDate
      status
      student {
        id
        user { id name }
      }
      employee {
        id
        user { id name }
      }
      vehicle {
        id
        vehicle_number: vehicleNumber
        vehicle_type: vehicleType
        driver_name: driverName
        route { id route_name: routeName }
      }
    }
  }
`;

export const REMOVE_TRANSPORT_ALLOCATION = gql`
  mutation RemoveTransportAllocation($id: ID!, $input: RemoveTransportAllocationInput!) {
    removeTransportAllocation(id: $id, input: $input) {
      id
      student_id: studentId
      vehicle_id: vehicleId
      status
      end_date: endDate
    }
  }
`;

// Bulk delete (hard delete) — returns the count removed. Mirrors the hostel
// bulkDelete* mutations. Deleting vehicles also clears their allocations
// server-side.
export const BULK_DELETE_TRANSPORT_ROUTES = gql`
  mutation BulkDeleteTransportRoutes($ids: [ID!]!) {
    bulkDeleteTransportRoutes(ids: $ids)
  }
`;

export const BULK_DELETE_TRANSPORT_VEHICLES = gql`
  mutation BulkDeleteTransportVehicles($ids: [ID!]!) {
    bulkDeleteTransportVehicles(ids: $ids)
  }
`;

export const BULK_DELETE_TRANSPORT_ALLOCATIONS = gql`
  mutation BulkDeleteTransportAllocations($ids: [ID!]!) {
    bulkDeleteTransportAllocations(ids: $ids)
  }
`;
