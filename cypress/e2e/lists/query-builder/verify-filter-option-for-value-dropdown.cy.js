import QueryModal, {
  holdingsFieldValues,
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import StatisticalCodeTypes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodeTypes';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { poll } from '../../../support/utils/polling';

describe('Lists', () => {
  describe('Query Builder', () => {
    const openQueryBuilderForRecordType = (listName, recordType) => {
      Lists.openNewListPane();
      cy.get('input[name="listName"]').should('be.visible');
      Lists.setName(listName);
      Lists.selectRecordType(recordType);
      Lists.buildQuery();
    };

    beforeEach('Login to Lists app', () => {
      cy.loginAsAdmin({
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });

    describe('Items', () => {
      const listName = `C1312673_List_${getRandomPostfix()}`;
      const testData = {
        materialType: {
          ...MaterialTypes.getDefaultMaterialType(),
          name: `AT_C1312673_Recording_${getRandomPostfix()}`,
        },
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MaterialTypes.createMaterialTypeViaApi(testData.materialType).then(({ body }) => {
          testData.materialType.id = body.id;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MaterialTypes.deleteViaApi(testData.materialType.id);
      });

      it(
        'C1312673 Verify that the "Filter" option exists for "Value" dropdown when building a query (corsair)',
        { tags: ['criticalPath', 'corsair', 'C1312673'] },
        () => {
          // Step 1: Create new list with Item record type
          openQueryBuilderForRecordType(listName, Lists.recordTypes.items);

          // Step 2: Select field "Material type — Name" and operator "IN"
          QueryModal.selectField(itemFieldValues.materialTypeName);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue([]);

          // Step 3: Change operator from "IN" to "equals"
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedValue('Select value');

          // Step 4: Click on "Select value" field
          QueryModal.verifySearchableFilterExists();

          // Step 5: Enter "rec" in the searchable field and verify filtering
          // Verify only material types containing "rec" are displayed
          QueryModal.verifyFilteredOptionsInValueSelect(testData.materialType.name, [
            testData.materialType.name,
          ]);
          QueryModal.clickCancel();
          QueryModal.verifyClosed();
        },
      );
    });

    describe('Holdings', () => {
      const listName = `C540398_List_${getRandomPostfix()}`;
      const testData = {
        statisticalCodeType: {
          source: 'local',
          name: `AT_C540398_Holdings_statistical_code_type_${getRandomPostfix()}`,
        },
        statisticalCode: {
          source: 'local',
          code: `at_c540398_holding_stat_code_${getRandomPostfix()}`,
          name: `AT_C540398_Holdings_statistical_code_${getRandomPostfix()}`,
        },
        statisticalCodeOption: '',
      };

      const waitForFieldValue = (recordType, fieldName, expectedOption) => {
        return Lists.getEntityTypeIdByNameViaApi(recordType).then((entityTypeId) => {
          return poll(
            () => cy.okapiRequest({
              path: `entity-types/${entityTypeId}/field-values`,
              searchParams: {
                field: fieldName,
                search: expectedOption,
              },
              isDefaultSearchParamsRequired: false,
              failOnStatusCode: false,
            }),
            ({ body }) => body.content?.some(({ label }) => label === expectedOption),
            {
              timeout: 120000,
              delay: 5000,
              errorMessage: `"${expectedOption}" did not appear in field values for ${recordType}`,
            },
          );
        });
      };

      before('Create test data', () => {
        cy.getAdminToken();
        return StatisticalCodeTypes.createViaApi(testData.statisticalCodeType).then((codeType) => {
          testData.statisticalCodeType.id = codeType.id;
          testData.statisticalCode.statisticalCodeTypeId = codeType.id;

          return StatisticalCodes.createViaApi(testData.statisticalCode).then((code) => {
            testData.statisticalCode.id = code.id;
            testData.statisticalCodeOption = `${codeType.name}: ${code.code} - ${code.name}`;
            return waitForFieldValue(
              Lists.recordTypes.holdings,
              'holdings.statistical_code_names',
              testData.statisticalCodeOption,
            );
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (testData.statisticalCode.id) {
          StatisticalCodes.deleteViaApi(testData.statisticalCode.id);
        }
        if (testData.statisticalCodeType.id) {
          StatisticalCodeTypes.deleteViaApi(testData.statisticalCodeType.id);
        }
      });

      it(
        'C540398 Verify that the "Value" dropdown has prepopulated values for "Holdings — Statistical codes" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C540398'] },
        () => {
          // Step 1: Create new list with Holdings record type
          openQueryBuilderForRecordType(listName, Lists.recordTypes.holdings);

          // Step 2: Select field "Holdings — Statistical codes" and operator "equals"
          QueryModal.selectField(holdingsFieldValues.holdingsStatisticalCodeNames);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedValue('Select value');

          // Step 3: Verify the Value dropdown is prepopulated with statistical code options
          QueryModal.verifyValueSelectContainsOptions([testData.statisticalCodeOption]);
          QueryModal.clickCancel();
          QueryModal.verifyClosed();
        },
      );
    });
  });
});
