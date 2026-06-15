import type {
  AlertRecord,
  AlertNotificationRecord,
  CreateAlertResponse,
  ListAlertNotificationsResponse,
} from "../schemas/alert.schema";

export type IAlert = AlertRecord;
export type IAlertNotification = AlertNotificationRecord;
export type ICreateAlertResponse = CreateAlertResponse;
export type IListAlertNotificationsResponse = ListAlertNotificationsResponse;
