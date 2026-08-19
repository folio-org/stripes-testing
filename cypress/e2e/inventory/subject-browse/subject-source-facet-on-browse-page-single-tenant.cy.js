import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import SubjectSources, {
  FOLIO_SUBJECT_SOURCES,
} from '../../../support/fragments/settings/inventory/instances/subjectSources';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const accordionName = 'Subject source';
    const localSourceCount = 4;
    const localSourceNames = Array.from(
      { length: localSourceCount },
      (_, i) => `AT_C569603_Source_${i}_${randomPostfix}`,
    );
    const localSourceCodes = Array.from(
      { length: localSourceCount },
      (_, i) => `AT_C569603_${i}_${randomPostfix}`,
    );
    const subjectValues = Array.from(
      { length: localSourceCount + FOLIO_SUBJECT_SOURCES.length },
      (_, i) => `AT_C569603_Subject_${i}_${randomPostfix}`,
    );
    const testData = {
      user: {},
      localSourceIds: [],
      folioSourceIds: [],
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      SubjectSources.getSubjectSourcesViaApi({ limit: 50, query: 'source=folio' }).then(
        (subjectSources) => {
          testData.folioSourceIds = subjectSources
            .filter((source) => FOLIO_SUBJECT_SOURCES.includes(source.name))
            .map((source) => source.id);
        },
      );
      cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
        for (let i = 0; i < localSourceCount; i++) {
          SubjectSources.createViaApi({
            source: 'local',
            name: localSourceNames[i],
            code: localSourceCodes[i],
          }).then((response) => {
            testData.localSourceIds.push(response.body.id);
          });
        }
        cy.then(() => {
          const subjectsData = [...testData.localSourceIds, ...testData.folioSourceIds].map(
            (sourceId, i) => ({
              value: subjectValues[i],
              sourceId,
            }),
          );
          cy.createInstance({
            instance: {
              instanceTypeId: instanceType.id,
              title: `AT_C569603_FolioInstance_${randomPostfix}`,
              subjects: subjectsData,
            },
          });
        });
      });
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi('C569603_');
        Users.deleteViaApi(testData.user.userId);
        testData.localSourceIds.forEach((id) => SubjectSources.deleteViaApi(id));
      });
    });

    it(
      'C569603 Check "Subject source" facet on "Browse" page (promin)',
      { tags: ['extendedPath', 'promin', 'C569603'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.select();
        subjectValues.forEach((subjectValue) => {
          BrowseSubjects.waitForSubjectToAppear(subjectValue);
        });

        // Step 1: Run browse with any search query; verify browse result list displayed
        BrowseSubjects.browse(subjectValues[0]);

        // Step 2: Expand "Subject source" accordion; verify accordion expanded and dropdown active
        BrowseSubjects.verifyAccordionStatusByName(accordionName, false);
        BrowseSubjects.expandAccordion(accordionName);
        BrowseSubjects.verifyAccordionStatusByName(accordionName, true);

        // Step 3: Click Subject source dropdown; verify all FOLIO and local sources (11+) are displayed
        BrowseSubjects.verifySubjectSourceDropdownOptions([
          ...FOLIO_SUBJECT_SOURCES,
          ...localSourceNames,
        ]);
      },
    );
  });
});
