import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectSources, {
  FOLIO_SUBJECT_SOURCES,
} from '../../../../support/fragments/settings/inventory/instances/subjectSources';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const accordionName = 'Subject source';
      const testData = {
        folioSourceIds: [],
      };
      const subjectValues = Array.from(
        { length: FOLIO_SUBJECT_SOURCES.length },
        (_, i) => `AT_C584534_Subject_${i}_${randomPostfix}`,
      );

      before('Create user, data', () => {
        cy.getAdminToken();
        SubjectSources.getSubjectSourcesViaApi({ limit: 50, query: 'source=folio' }).then(
          (subjectSources) => {
            testData.folioSourceIds = subjectSources
              .filter((source) => FOLIO_SUBJECT_SOURCES.includes(source.name))
              .map((source) => source.id);
          },
        );
        cy.then(() => {
          cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
            const subjectsData = testData.folioSourceIds.map((sourceId, i) => ({
              value: subjectValues[i],
              sourceId,
            }));
            cy.createInstance({
              instance: {
                instanceTypeId: instanceType.id,
                title: `AT_C584534_FolioInstance_${randomPostfix}`,
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
        InventoryInstances.deleteInstanceByTitleViaApi('C584534_');
      });

      it(
        'C584534 (CONSORTIA) Check "Subject source" facet on "Browse" page (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C584534'] },
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
          BrowseSubjects.verifySubjectSourceDropdownOptions(FOLIO_SUBJECT_SOURCES);
        },
      );
    });
  });
});
