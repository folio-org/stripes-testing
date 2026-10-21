import CapabilitySets from '../../support/dictionary/capabilitySets';
import Permissions from '../../support/dictionary/permissions';
import EHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackageView from '../../support/fragments/eholdings/eHoldingsPackageView';
import eHoldingsResourceView from '../../support/fragments/eholdings/eHoldingsResourceView';
import { ExportManagerSearchPane, Exports } from '../../support/fragments/exportManager';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix, { randomNDigitNumber } from '../../support/utils/stringTools';

describe('Export Manager', () => {
  const randomPostfix = getRandomPostfix();
  const randomDigits = `377016${randomNDigitNumber(15)}`;

  const testData = {
    tag008: '008',
    tag100: '100',
    tag240: '240',
    tag245: '245',
    authorityNaturalId: `n${randomDigits}`,
    auth100Content: `$a AT_C1263891_MarcAuthority_${randomPostfix}, $d 1770-1827`,
    bibTitle: `AT_C1263891_MarcBibInstance_${randomPostfix}`,
    bib240InitialContent: `$a AT_C1263891_MarcAuthority_${randomPostfix}, $d 1770-1827`,
  };

  const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
  const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

  // Capability sets for the "all Export Manager permissions" actor: Export Manager view +
  // resend/download action + full Data-Export manage - none of these grant access to the
  // domain-specific files behind eHoldings/Authority control job types
  const capabSetsToAssign = [
    CapabilitySets.uiExportManagerExportManagerView,
    CapabilitySets.uiExportManagerJobsDownloadAndResendExecute,
    CapabilitySets.dataExportManage,
    CapabilitySets.dataExportConfigManage,
    CapabilitySets.dataExportJobManage,
  ];

  let setupUser;
  let actorUser;
  let authorityId;
  let bibId;
  let authorityJobId;
  let failedUpdatesJobId;
  let eHoldingsJobId;
  let packageId;

  before('Create test data', () => {
    cy.getAdminToken();
    MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1263891_');
    InventoryInstances.deleteInstanceByTitleViaApi('C1263891_');

    // Resolve a package with at least one title via API, then navigate to it directly by id
    // (rather than searching by name) - the row heading shown in search results is
    // "<name> (<package display name>)" whenever a display name is set, which makes
    // name-based matching unreliable
    EHoldingsPackages.getPackagesViaApi({
      'filter[selected]': true,
      count: 100,
      pageSize: 100,
    }).then(({ data }) => {
      packageId = data.find((pkg) => !pkg.attributes.isCustom && pkg.attributes.titleCount > 0).id;
    });

    // "Failed updates: Linked bibliographic fields" completed export job - triggered directly
    // via API, no UI steps or failure scenario needed to produce a completed job of this type.
    // job.name (not job.id) is what Export Manager displays as "Job ID", matching the
    // existing MARC authority report flow below.
    cy.createFailedLinkedBibUpdatesReportViaAPI().then((job) => {
      failedUpdatesJobId = job.name;
      Exports.getFinishedExportJobViaApi(job.id);
    });

    cy.then(() => {
      MarcAuthorities.createMarcAuthorityViaAPI('', testData.authorityNaturalId, [
        { tag: testData.tag100, content: testData.auth100Content, indicators: ['1', '\\'] },
      ]).then((id) => {
        authorityId = id;
      });

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
        { tag: testData.tag008, content: QuickMarcEditor.valid008ValuesInstance },
        { tag: testData.tag245, content: `$a ${testData.bibTitle}`, indicators: ['1', '1'] },
        { tag: testData.tag240, content: '$a placeholder', indicators: ['1', '0'] },
      ]).then((instanceId) => {
        bibId = instanceId;
      });
    })
      .then(() => {
        QuickMarcEditor.linkMarcRecordsViaApi({
          bibId,
          authorityIds: [authorityId],
          bibFieldTags: [testData.tag240],
          authorityFieldTags: [testData.tag100],
          finalBibFieldContents: [testData.bib240InitialContent],
        });
        MarcAuthorities.waitAuthorityLinked(authorityId, 1);
      })
      .then(() => {
        // Setup user: only used to generate the "MARC authority headings updates" and
        // "eHoldings" precondition jobs - not the actor whose Export Manager capabilities
        // are under test
        cy.createTempUser([
          Permissions.exportManagerAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.moduleeHoldingsEnabled.gui,
          Permissions.uiAgreementsSearchAndView.gui,
          Permissions.uiNotesItemView.gui,
        ]).then((userProperties) => {
          setupUser = userProperties;

          cy.login(setupUser.username, setupUser.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          // "MARC authority headings updates" completed export job
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getAuthorityJobId');
          cy.wait('@getAuthorityJobId', { timeout: 10000 }).then((item) => {
            authorityJobId = item.response.body.name;
            MarcAuthorities.checkCalloutAfterExport(authorityJobId);
            Exports.getFinishedExportJobViaApi(item.response.body.id);
          });

          // "eHoldings" completed export job - export a single title+package resource
          // (Export title+package (CSV), from the Resource pane) rather than the whole
          // package, which by default exports every title in it and can take a long time
          cy.visit(`${TopMenu.eholdingsPath}/packages/${packageId}`);
          EHoldingsPackageView.waitLoading();
          EHoldingsPackageView.selectTitleRecord();
          cy.intercept('POST', '/data-export-spring/jobs').as('getEHoldingsJobId');
          eHoldingsResourceView.openExportModal().clickExportButton();
          cy.wait('@getEHoldingsJobId', { timeout: 10000 }).then((item) => {
            eHoldingsJobId = item.response.body.name;
            Exports.getFinishedExportJobViaApi(item.response.body.id);
          });
        });
      })
      .then(() => {
        cy.getAdminToken();

        cy.createTempUser([]).then((userProperties) => {
          actorUser = userProperties;
          cy.assignCapabilitiesToExistingUser(actorUser.userId, [], capabSetsToAssign);
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    MarcAuthority.deleteViaAPI(authorityId, true);
    InventoryInstance.deleteInstanceViaApi(bibId);
    Users.deleteViaApi(setupUser.userId);
    Users.deleteViaApi(actorUser.userId);
  });

  it(
    'C1263891 User with all Export Manager permissions can view executed jobs but cannot download eHoldings, authority control files (promin)',
    { tags: ['extendedPath', 'promin', 'C1263891'] },
    () => {
      cy.login(actorUser.username, actorUser.password, {
        path: TopMenu.exportManagerPath,
        waiter: ExportManagerSearchPane.waitLoading,
      });

      // Step 1: filter by "Authority control" + "eHoldings" job types - Job ID links disabled
      // for every resulting row
      ExportManagerSearchPane.searchByAuthorityControl();
      ExportManagerSearchPane.searchByEHoldings();
      cy.wait(3000);
      [authorityJobId, failedUpdatesJobId, eHoldingsJobId].forEach((jobId) => {
        ExportManagerSearchPane.verifyJobRowHasNoLinkInList(jobId);
      });

      // Step 2: "MARC authority headings updates" job detail view - Job ID has no link
      ExportManagerSearchPane.openJobDetailView(authorityJobId);
      ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();

      // Step 3: "Failed updates: Linked bibliographic fields" job detail view - Job ID has no link
      ExportManagerSearchPane.closeExportJobPane();
      ExportManagerSearchPane.openJobDetailView(failedUpdatesJobId);
      ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();

      // Step 4: "eHoldings" job detail view - Job ID has no link
      ExportManagerSearchPane.closeExportJobPane();
      ExportManagerSearchPane.openJobDetailView(eHoldingsJobId);
      ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();
    },
  );
});
