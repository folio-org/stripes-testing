import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectTypes, {
  FOLIO_SUBJECT_TYPES,
} from '../../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const accordionName = 'Subject type';
      const testData = {
        folioTypeIds: [],
      };
      const subjectValues = Array.from(
        { length: FOLIO_SUBJECT_TYPES.length },
        (_, i) => `AT_C584535_Subject_${i}_${randomPostfix}`,
      );

      before('Create user, data', () => {
        cy.getAdminToken();
        SubjectTypes.getSubjectTypesViaApi({ limit: 50, query: 'source=folio' }).then(
          (subjectTypes) => {
            testData.folioTypeIds = subjectTypes
              .filter((type) => FOLIO_SUBJECT_TYPES.includes(type.name))
              .map((type) => type.id);
          },
        );
        cy.then(() => {
          cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
            const subjectsData = testData.folioTypeIds.map((typeId, i) => ({
              value: subjectValues[i],
              typeId,
            }));
            cy.createInstance({
              instance: {
                instanceTypeId: instanceType.id,
                title: `AT_C584535_FolioInstance_${randomPostfix}`,
                subjects: subjectsData,
              },
            });
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('C584535_');
      });

      it(
        'C584535 (CONSORTIA) Check "Subject type" facet on "Browse" page (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C584535'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyBrowseOptions();
          BrowseSubjects.select();
          subjectValues.forEach((subjectValue) => {
            BrowseSubjects.waitForSubjectToAppear(subjectValue);
          });
          BrowseSubjects.verifyAccordionStatusByName(accordionName, false);
          BrowseSubjects.expandAccordion(accordionName);
          BrowseSubjects.verifyAccordionStatusByName(accordionName, true);
          BrowseSubjects.verifySubjectTypeDropdownOptions(FOLIO_SUBJECT_TYPES);
        },
      );
    });
  });
});
