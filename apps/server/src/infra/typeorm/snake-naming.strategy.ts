import { DefaultNamingStrategy } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export class SnakeNamingStrategy extends DefaultNamingStrategy {
  tableName(className: string, customName?: string): string {
    return customName ?? super.tableName(className, customName);
  }

  columnName(propertyName: string, customName?: string): string {
    return customName ?? snakeCase(propertyName);
  }

  relationName(propertyName: string): string {
    return propertyName;
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    _firstPropertyName: string,
    _secondPropertyName: string,
  ): string {
    return snakeCase(`${firstTableName}_${secondTableName}`);
  }

  joinKeyColumnName(entityName: string, referencedColumnName: string): string {
    return snakeCase(`${entityName}_${referencedColumnName}`);
  }

  eagerRelationPath(alias: string, propertyPath: string): string {
    return `${alias}.${propertyPath}`;
  }
}