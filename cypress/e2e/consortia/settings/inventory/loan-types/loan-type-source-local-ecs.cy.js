import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import { Permissions } from '../../../../../support/dictionary';
import Users from '../../../../../support/fragments/users/users';
import LoanTypes from '../../../../../support/fragments/settings/inventory/items/loanTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Button, TextField } from '../../../../../../interactors';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Settings', () => {
    describe('Inventory', () => {
      describe('Loan types', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          centralLoanTypeName: `AT_C877074_LoanType_Central_${randomPostfix}`,
          memberLoanTypeName: `AT_C877074_LoanType_Member_${randomPostfix}`,
          centralLoanTypeId: null,
          memberLoanTypeId: null,
        };
        let user;

        before('Create user with permissions', () => {
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiCreateEditDeleteLoanTypes.gui]).then(
            (userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiCreateEditDeleteLoanTypes.gui,
              ]);
              cy.resetTenant();

              cy.login(user.username, user.password, {
                path: SettingsMenu.loanTypesPath,
                waiter: LoanTypes.waitLoading,
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (testData.centralLoanTypeId) {
            LoanTypes.deleteLoanTypesViaApi(testData.centralLoanTypeId);
          }
          cy.setTenant(Affiliations.College);
          if (testData.memberLoanTypeId) {
            LoanTypes.deleteLoanTypesViaApi(testData.memberLoanTypeId);
          }
          cy.resetTenant();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C877074 "source" field is filled with "local" value when creating loan type in Central and Member tenants (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C877074'] },
          () => {
            cy.intercept('POST', '/loan-types').as('createLoanTypeCentral');

            cy.do(Button('+ New').click());
            cy.do(TextField().fillIn(testData.centralLoanTypeName));
            cy.do(Button('Save').click());

            cy.wait('@createLoanTypeCentral').then(({ request, response }) => {
              expect(request.body.source).to.equal('local');
              testData.centralLoanTypeId = response.body.id;
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            cy.visit(SettingsMenu.loanTypesPath);
            LoanTypes.waitLoading();

            cy.intercept('POST', '/loan-types').as('createLoanTypeMember');

            cy.do(Button('+ New').click());
            cy.do(TextField().fillIn(testData.memberLoanTypeName));
            cy.do(Button('Save').click());

            cy.wait('@createLoanTypeMember').then(({ request, response }) => {
              expect(request.body.source).to.equal('local');
              testData.memberLoanTypeId = response.body.id;
            });
          },
        );
      });
    });
  });
});
