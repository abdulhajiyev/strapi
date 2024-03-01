import { map, values, sumBy, pipe, flatMap } from 'lodash/fp';
import type { Schema, Public } from '@strapi/types';

const getNumberOfDynamicZones = () => {
  const contentTypes: Record<Public.UID.ContentType, Schema.ContentType> = strapi.contentTypes;

  return pipe(
    map('attributes'),
    flatMap(values),
    sumBy((item) => {
      if (item.type === 'dynamiczone') {
        return 1;
      }
      return 0;
    })
  )(contentTypes);
};

export default getNumberOfDynamicZones;