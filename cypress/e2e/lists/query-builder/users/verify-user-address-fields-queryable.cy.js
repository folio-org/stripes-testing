import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  STRING_STORES_UUID_OPERATORS,
  booleanOperatorsInRepeatableFields,
  usersFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1045968';
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
};
const userAddress = {
  addressLine1: '2nd array',
  addressLine2: 'Moldovakan 20',
  addressTypeId: null,
  city: 'Yerevan',
  countryId: 'AM',
  postalCode: '170495',
  region: 'Nor Nork',
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users', () => {
      before('Create test data and login', () => {
        cy.createTempUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.getUsers({ query: `username=${user.username}` }).then((users) => {
              cy.getAddressTypesApi({ query: 'addressType=="Home"' }).then((addressTypes) => {
                userAddress.addressTypeId = addressTypes[0].id;

                cy.updateUser({
                  ...users[0],
                  personal: {
                    ...users[0].personal,
                    addresses: [userAddress],
                  },
                });
              });
            });

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1045968 Verify that User Address fields are queryable (athena)',
        { tags: ['criticalPath', 'athena', 'C1045968'] },
        () => {
          // Step 1: Create new list with Users record type and open Query Builder
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.users);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Verify 'User — Address — City' field has string operators
          QueryModal.selectField(usersFieldValues.userAddressCity);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('test');
          QueryModal.verifyTextFieldValue('test');

          // Step 3: Verify 'User — Address — Country' field has UUID string operators and searchable filter
          QueryModal.selectField(usersFieldValues.userAddressCountry);
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('Armenia');

          // Step 4: Verify 'User — Address — Line 1' field has string operators
          QueryModal.selectField(usersFieldValues.userAddressLine1);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('test');
          QueryModal.verifyTextFieldValue('test');

          // Verify 'User — Address — Line 2' field has string operators
          QueryModal.selectField(usersFieldValues.userAddressLine2);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('test');
          QueryModal.verifyTextFieldValue('test');

          // Step 5: Verify 'User — Address — Postal code' field has string operators
          QueryModal.selectField(usersFieldValues.userAddressPostalCode);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('test');
          QueryModal.verifyTextFieldValue('test');

          // Step 6: Verify 'User — Address — Primary address' field has boolean operators and True/False options
          QueryModal.selectField(usersFieldValues.userAddressPrimaryAddress);
          QueryModal.verifyOperatorsList(booleanOperatorsInRepeatableFields);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect(['True', 'False']);

          // Step 7: Verify 'User — Address — Region' field has string operators
          QueryModal.selectField(usersFieldValues.userAddressRegion);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('test');
          QueryModal.verifyTextFieldValue('test');

          // Step 8: Verify 'User — Address — Type' field has UUID string operators and searchable filter
          QueryModal.selectField(usersFieldValues.userAddressType);
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySearchableFilterExists();

          // Step 9: Select 'Home' address type, run test query and verify results
          QueryModal.chooseValueSelect('Home');
          QueryModal.addNewRow(0);
          QueryModal.selectField(usersFieldValues.userAddressCountry, 1);
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('Armenia', 1);

          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 10: Show columns, uncheck all, select 'User — Address' column and verify embedded table
          QueryModal.verifyUserAddressEmbeddedTableInQueryModal(user.barcode, {
            city: userAddress.city,
            region: userAddress.region,
            country: 'Armenia',
            postalCode: userAddress.postalCode,
            line1: userAddress.addressLine1,
            type: 'Home',
            primaryAddress: '',
            line2: userAddress.addressLine2,
          });
        },
      );
    });
  });
});
