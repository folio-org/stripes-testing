import { v4 as uuidv4 } from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import Departments from '../../support/fragments/settings/users/departments';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { NO_VALUE } from '../../support/constants';

describe('Users', () => {
  describe('Edit Extended information of User record', () => {
    const testData = {
      departments: [],
      servicePoint: {},
    };
    const dateEnrolled = '01/15/2020';
    const externalSystemId = `AT_C15861_ExtSysId_${getRandomPostfix()}`;
    const birthDate = '06/20/1990';

    before('Create test data', () => {
      cy.getAdminToken();
      // Create two departments
      const dept1Body = {
        id: uuidv4(),
        name: `AT_C15861_Dept1_${getRandomPostfix()}`,
        code: `D1_${getRandomPostfix()}`,
      };
      const dept2Body = {
        id: uuidv4(),
        name: `AT_C15861_Dept2_${getRandomPostfix()}`,
        code: `D2_${getRandomPostfix()}`,
      };
      Departments.createViaApi(dept1Body).then(() => {
        testData.departments.push(dept1Body);
      });
      Departments.createViaApi(dept2Body).then(() => {
        testData.departments.push(dept2Body);
      });
      // Get service point
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        testData.servicePoint = servicePoint;
      });
      // Create temp user with required permissions
      cy.createTempUser([
        Permissions.uiUserEdit.gui,
        Permissions.uiUsersEdituserservicepoints.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );
        // Create test user (User 1) with service points, no departments, no address, delivery unchecked
        cy.createTempUser([]).then((testUserProperties) => {
          testData.testUser = testUserProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.testUser.userId,
            testData.servicePoint.id,
          );
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.testUser.userId);
      Users.deleteViaApi(testData.user.userId);
      testData.departments.forEach((dept) => {
        Departments.deleteViaApi(dept.id);
      });
    });

    it(
      'C15861 - Edit Extended information of User record',
      { tags: ['extendedPath', 'volaris', 'C15861'] },
      () => {
        // Step 0: Search for User 1 and open details
        UsersSearchPane.searchByUsername(testData.testUser.username);
        UsersCard.verifyUserCardOpened();

        // Step 1: Expand the "Extended information" accordion on user details pane
        UsersCard.openExtendedInformationAccordion();
        UsersCard.verifyExtendedInfoRowsLayout({
          dateEnrolled: '-',
          externalSystemId: NO_VALUE,
          birthDate: '-',
          folioNumber: testData.testUser.userId,
          holdShelfChecked: true,
          deliveryChecked: false,
          defaultPickupServicePoint: NO_VALUE,
          fulfillmentPreference: 'Hold Shelf',
          defaultDeliveryAddress: NO_VALUE,
          departments: [NO_VALUE],
          username: testData.testUser.username,
        });

        // Step 2: Click "Actions" -> "Edit" on user details pane
        UserEdit.openEdit();
        UserEdit.verifyExtendedInformationFieldsInEditMode({
          dateEnrolled: '',
          externalSystemId: '',
          birthDate: '',
          folioNumber: testData.testUser.userId,
          holdShelfChecked: true,
          deliveryChecked: false,
          fulfillmentPreferenceDisabled: true,
          defaultDeliveryAddressDisabled: true,
          defaultPickupServicePoint: NO_VALUE,
          fulfillmentPreference: 'Hold Shelf',
          defaultDeliveryAddress: NO_VALUE,
          departments: [NO_VALUE],
          username: testData.testUser.username,
        });

        // Step 3: Click on "info" icon next to "Fulfillment preference" field
        UserEdit.clickFulfillmentPreferenceInfoIcon();
        UserEdit.verifyFulfillmentPreferenceTooltip();

        // Step 4: Add an address to user
        UserEdit.addAddress('Home');

        // Step 5: Check the "Delivery" checkbox
        UserEdit.checkDeliveryCheckbox();
        UserEdit.verifyFulfillmentPreferenceDisabled(false);
        UserEdit.verifyDefaultDeliveryAddressDisabled(false);

        // Step 6: Populate extended information fields
        UserEdit.changeDateEnrolled(dateEnrolled);
        UserEdit.changeExternalSystemId(externalSystemId);
        UserEdit.changeBirthDate(birthDate);
        UserEdit.chooseDefaultPickupServicePoint(testData.servicePoint.name);
        UserEdit.chooseFulfillmentPreference('Delivery');
        UserEdit.chooseDefaultDeliveryAddress('Home');
        UserEdit.selectDepartments([testData.departments[0].name, testData.departments[1].name]);

        // Step 7: Click on "Save & close" button
        UserEdit.saveAndClose();

        // Step 8: Expand the "Extended information" accordion and verify updated values
        UsersCard.openExtendedInformationAccordion();
        UsersCard.verifyExtendedInfoRowsLayout({
          dateEnrolled: DateTools.clearPaddingZero(dateEnrolled),
          externalSystemId,
          birthDate: DateTools.clearPaddingZero(birthDate),
          folioNumber: testData.testUser.userId,
          holdShelfChecked: true,
          deliveryChecked: true,
          defaultPickupServicePoint: testData.servicePoint.name,
          fulfillmentPreference: 'Delivery',
          defaultDeliveryAddress: 'Home',
          departments: [testData.departments[0].name, testData.departments[1].name],
          username: testData.testUser.username,
        });

        // Step 9: Click "Actions" -> "Edit", uncheck "Delivery" checkbox
        UserEdit.openEdit();
        UserEdit.uncheckDeliveryCheckbox();
        UserEdit.verifyFulfillmentPreferenceDisabled(true);
        UserEdit.verifyFulfillmentPreferenceValue('Hold Shelf');
        UserEdit.verifyDefaultDeliveryAddressDisabled(true);
        UserEdit.verifyDefaultDeliveryAddressValue('');

        // Step 10: Click "Save & close" and verify
        UserEdit.saveAndClose();
        UsersCard.openExtendedInformationAccordion();
        UsersCard.verifyExtendedInfoRowsLayout({
          dateEnrolled: DateTools.clearPaddingZero(dateEnrolled),
          externalSystemId,
          birthDate: DateTools.clearPaddingZero(birthDate),
          folioNumber: testData.testUser.userId,
          holdShelfChecked: true,
          deliveryChecked: false,
          defaultPickupServicePoint: testData.servicePoint.name,
          fulfillmentPreference: NO_VALUE,
          defaultDeliveryAddress: NO_VALUE,
          departments: [testData.departments[0].name, testData.departments[1].name],
          username: testData.testUser.username,
        });
      },
    );
  });
});
