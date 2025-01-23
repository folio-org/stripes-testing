import { INSTANCE_DATE_TYPES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
      let user;
      const dateTypesData = [
        { name: INSTANCE_DATE_TYPES.BC, code: 'b', delimiter: ',', keepDelimiter: false },
        {
          name: INSTANCE_DATE_TYPES.CONTINUING_PUBLISHED,
          code: 'c',
          delimiter: '-',
          keepDelimiter: true,
        },
        {
          name: INSTANCE_DATE_TYPES.CONTINUING_CEASED,
          code: 'd',
          delimiter: '-',
          keepDelimiter: true,
        },
        { name: INSTANCE_DATE_TYPES.DETAILED, code: 'e', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.INCLUSIVE, code: 'i', delimiter: '-', keepDelimiter: true },
        { name: INSTANCE_DATE_TYPES.RANGE, code: 'k', delimiter: '-', keepDelimiter: true },
        { name: INSTANCE_DATE_TYPES.MULTIPLE, code: 'm', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.UNKNOWN, code: 'n', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.DISTRIBUTION, code: 'p', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.QUESTIONABLE, code: 'q', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.REPRINT, code: 'r', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.SINGLE, code: 's', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.PUBLICATION, code: 't', delimiter: ',', keepDelimiter: false },
        {
          name: INSTANCE_DATE_TYPES.CONTINUING_UNKNOWN,
          code: 'u',
          delimiter: '-',
          keepDelimiter: true,
        },
        { name: INSTANCE_DATE_TYPES.NO, code: '|', delimiter: ',', keepDelimiter: false },
      ];

      before('Create user, authorize', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.getInstanceDateTypes.gui]).then((userProperties) => {
          user = userProperties;
          cy.getToken(user.username, user.password, false);
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C506693 API | View Date types (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C506693'] },
        () => {
          cy.getInstanceDateTypesViaAPI().then((response) => {
            dateTypesData.forEach((expectedDateType) => {
              const matchingDateTypes = response.instanceDateTypes.filter((retrievedDateType) => {
                return (
                  retrievedDateType.name === expectedDateType.name &&
                  retrievedDateType.code === expectedDateType.code &&
                  retrievedDateType.displayFormat.delimiter === expectedDateType.delimiter &&
                  retrievedDateType.displayFormat.keepDelimiter === expectedDateType.keepDelimiter
                );
              });
              expect(matchingDateTypes).to.have.lengthOf(1);
            });
          });
        },
      );
    });
  });
});
