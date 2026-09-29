import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CustomFields from '../../support/fragments/settings/users/customFields';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import {
  generateCheckboxCustomFieldData,
  generateTextFieldCustomFieldData,
} from '../../support/utils/customFields';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Check out', () => {
  const TEST_ID = 'C1415949';
  const testPrefix = `AT_${TEST_ID}`;
  let servicePoint;
  let patronUser;
  let staffUser;
  let createdCustomFieldIds = [];
  let savedOtherSettings = null;

  const customFieldsData = [
    generateTextFieldCustomFieldData({
      testNumber: TEST_ID,
      data: {
        name: `${testPrefix}_TextField_${getRandomPostfix()}`,
        displayInAccordion: 'default',
      },
    }),
    generateCheckboxCustomFieldData({
      testNumber: TEST_ID,
      data: {
        name: `${testPrefix}_Checkbox_${getRandomPostfix()}`,
        displayInAccordion: 'fees_fines',
      },
    }),
  ];

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          servicePoint = sp;
        });
      })
      .then(() => {
        OtherSettings.getOtherSettingsViaApi().then((response) => {
          if (response.body.circulationSettings.length !== 0) {
            savedOtherSettings = response.body.circulationSettings[0];
            OtherSettings.deleteOtherSettingsViaApi(savedOtherSettings.id);
          }
        });
      })
      .then(() => {
        CustomFields.createCustomFieldsViaApi(customFieldsData).then((fields) => {
          createdCustomFieldIds = fields.map((f) => f.id);
        });
      })
      .then(() => {
        cy.createTempUser([]).then((userProps) => {
          patronUser = userProps;
        });
      })
      .then(() => {
        cy.createTempUser([Permissions.checkoutAll.gui]).then((userProps) => {
          staffUser = userProps;
          UserEdit.addServicePointViaApi(servicePoint.id, staffUser.userId, servicePoint.id);
        });
      })
      .then(() => {
        cy.waitForAuthRefresh(() => {
          cy.login(staffUser.username, staffUser.password, {
            path: TopMenu.checkOutPath,
            waiter: CheckOutActions.waitLoading,
          });
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CustomFields.deleteCustomFieldsViaApi({ ids: createdCustomFieldIds });
    Users.deleteViaApi(patronUser.userId);
    Users.deleteViaApi(staffUser.userId);
    if (savedOtherSettings) {
      OtherSettings.restoreOtherSettingsViaApi(savedOtherSettings);
    }
  });

  it(
    'C1415949 Custom fields are NOT displayed at Check out if default "Other settings" is kept (vega)',
    { tags: ['extendedPath', 'vega', 'C1415949', 'nonParallel'] },
    () => {
      CheckOutActions.checkOutUser(patronUser.barcode);
      CheckOutActions.checkPatronInformation();
      CheckOutActions.verifyCustomFieldsAbsentInPatronPane(customFieldsData.map((f) => f.name));
    },
  );
});
