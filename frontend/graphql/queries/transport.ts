import { gql } from "@apollo/client";

// The server exposes transport fields in camelCase (gqlgen default), but the
// Redux types in types/general/entities.ts and the Transport page read them in
// snake_case (route_name, start_point, …). There is no global case-transform
// on the Apollo client, so we alias each multi-word field here. Single-word
// fields (stops, distance, status, capacity) match either way and need no
// alias.
export const GET_TRANSPORT_ROUTES = gql`
  query GetTransportRoutes {
    transportRoutes {
      id
      route_name: routeName
      start_point: startPoint
      end_point: endPoint
      stops
      distance
    }
  }
`;

export const GET_TRANSPORT_VEHICLES = gql`
  query GetTransportVehicles($routeId: String) {
    transportVehicles(routeId: $routeId) {
      id
      vehicle_number: vehicleNumber
      vehicle_type: vehicleType
      capacity
      driver_name: driverName
      driver_phone: driverPhone
      route_id: routeId
      status
      route {
        id
        route_name: routeName
        start_point: startPoint
        end_point: endPoint
      }
    }
  }
`;

export const GET_TRANSPORT_ALLOCATIONS = gql`
  query GetTransportAllocations {
    transportAllocations {
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
