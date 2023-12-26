import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';

export default {
  getDefaultClassificationType() {
    return {
      id: uuid,
      name: `autotest_classification_type_${getRandomPostfix()}`,
      source: 'local',
    };
  },
  getClassificationTypesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'classification-types',
        searchParams,
      })
      .then(({ body }) => body);
  },
  createClassificationTypeViaApi(classificationType) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'classification-types',
        body: classificationType,
      })
      .then(({ body }) => body);
  },
  deleteClassificationTypeViaApi(classificationTypeId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `classification-types/${classificationTypeId}`,
    });
  },
};
