import { SetMetadata } from '@nestjs/common';

export enum Permission {
  UserManage = 'user:manage',
  UserRead = 'user:read',
  SurveyRead = 'survey:read',
  SurveyWrite = 'survey:write',
  QuestionRead = 'question:read',
  QuestionWrite = 'question:write',
  AssignmentRead = 'assignment:read',
  AssignmentWrite = 'assignment:write',
}

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
