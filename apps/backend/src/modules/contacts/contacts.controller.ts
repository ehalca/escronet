import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { IsString, Length } from "class-validator";
import { ContactsService } from "./contacts.service";

class UpsertContactDto {
  @IsString()
  @Length(1, 128)
  ownerUserId!: string;

  @IsString()
  @Length(64, 64)
  contactPhoneHash!: string;

  @IsString()
  @Length(5, 4096)
  fcmToken!: string;

  @IsString()
  @Length(1, 120)
  displayName!: string;
}

@Controller("contacts")
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Put("designated")
  upsert(@Body() dto: UpsertContactDto) {
    return this.contactsService.upsertDesignatedContact(dto);
  }

  @Get("designated")
  getForOwner(@Query("ownerUserId") ownerUserId: string) {
    return this.contactsService.getDesignatedContact(ownerUserId);
  }
}
