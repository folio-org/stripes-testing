import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        authoritySearchOption: 'Keyword',
        sharedMarcAuthValue: 'Gálvez Shared C410775',
        marcAuthFileM1: 'Lentz Local C410775',
        marcAuthFileM2: 'Gálvez Local C410775',
        collegeHoldings: [],
        tag245: '245',
        tag245DerivedContent:
          '$a C410775 Murder in Mérida, 1792 : derived record $b violence, factions, and the law / $c Mark W. Lentz.',
        instanceTitle:
          'C410775 Murder in Mérida, 1792 : violence, factions, and the law / Mark W. Lentz.',
        instanceEditedTitle:
          'C410775 Murder in Mérida, 1792 : derived record violence, factions, and the law / Mark W. Lentz.',
        deriveLocalPaneheaderText: 'Derive a new local MARC bib record',
        contributor: 'Contributor',
        subject: 'Subject',
        linkAuthorityIcon: 'Linked to MARC authority',
      };

      const users = {};

      const createdRecordIDs = [];

      const marcFiles = [
        {
          marc: 'marcBibFileForC410775.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          tenant: 'Central Office',
        },
        {
          marc: 'marcAuthFileForC410775-Shared.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'Central Office',
        },
        {
          marc: 'marcAuthFileForC410775-Local-M1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'University',
        },
        {
          marc: 'marcAuthFileForC410775-Local-M2.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'College',
        },
      ];

      const linkableFields = [600, 700, 710];

      const linked600Field = [
        29,
        '600',
        '1',
        '0',
        '$a Gálvez Shared C410775',
        '$x Assassination.',
        '$0 http://id.loc.gov/authorities/names/n20114107752',
        '',
      ];

      const linked700Field = [
        38,
        '700',
        '\\',
        '\\',
        '$a Lentz Local C410775',
        '',
        '$0 http://id.loc.gov/authorities/names/n20114107753',
        '',
      ];

      const notLinked710Field = [39, '710', '\\', '\\', '$a Gálvez710 $0 n20114107754'];

      let collegeSourceId;

      before('Create users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
          (tenant) => {
            cy.withinTenant(tenant, () => {
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C410775');
            });
          },
        );

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === 'University') {
                cy.setTenant(Affiliations.University);
              } else if (marcFile.tenant === 'College') {
                cy.setTenant(Affiliations.College);
              }
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
          })
          .then(() => {
            // adding Holdings in College for shared Instance
            cy.setTenant(Affiliations.University);
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              testData.collegeLocation = location;
              InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                (holdingSources) => {
                  collegeSourceId = holdingSources[0].id;
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: createdRecordIDs[0],
                    permanentLocationId: testData.collegeLocation.id,
                    sourceId: collegeSourceId,
                  }).then((holding) => {
                    testData.collegeHoldings.push(holding);
                  });
                },
              );
            });
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        cy.setTenant(Affiliations.College);
        MarcAuthority.deleteViaAPI(createdRecordIDs[3]);
        cy.setTenant(Affiliations.University);
        MarcAuthority.deleteViaAPI(createdRecordIDs[2]);
        testData.collegeHoldings.forEach((holding) => {
          InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        });
        Locations.deleteViaApi(testData.collegeLocation);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[4]);
      });

      it(
        'C410775 Derive new Local MARC bib record from shadow Instance with "MARC" source and link it in Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C410775'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstance.checkPresentedText(testData.instanceTitle);
          InventoryInstance.checkSharedTextInDetailView();
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkPaneheaderContains(testData.deriveLocalPaneheaderText);
          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
          InventoryInstance.verifyAndClickLinkIcon(linked600Field[1]);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorityBrowse.checkSearchOptions();
          MarcAuthorities.checkRow(`Shared${testData.sharedMarcAuthValue}`);
          MarcAuthorities.selectTitle(`Shared\n${testData.sharedMarcAuthValue}`);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linked600Field[1], linked600Field[0]);
          QuickMarcEditor.verifyTagFieldAfterLinking(...linked600Field);
          QuickMarcEditor.clickLinkHeadingsButton();
          QuickMarcEditor.checkCallout('Field 700 has been linked to MARC authority record(s).');
          QuickMarcEditor.checkCallout(
            'Field 710 must be set manually by selecting the link icon.',
          );
          QuickMarcEditor.verifyEnabledLinkHeadingsButton();
          QuickMarcEditor.verifyTagFieldAfterLinking(...linked700Field);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...notLinked710Field);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkPresentedText(testData.instanceEditedTitle);
          InventoryInstance.checkSharedTextInDetailView(false);
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.getId().then((id) => {
            createdRecordIDs.push(id);
          });
          InventoryInstance.verifyRecordAndMarcAuthIcon(
            testData.contributor,
            `${testData.linkAuthorityIcon}\n${testData.marcAuthFileM1}`,
          );
          InventoryInstance.verifyRecordAndMarcAuthIcon(
            testData.subject,
            `${testData.linkAuthorityIcon}\n${testData.sharedMarcAuthValue}`,
          );
          InventoryInstance.verifyRecordAndMarcAuthIconAbsence(
            testData.contributor,
            `${testData.linkAuthorityIcon}\n${testData.marcAuthFileM2}`,
          );

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.clickKeepLinkingButton();
          cy.wait(1000);
          QuickMarcEditor.checkPaneheaderContains(testData.deriveLocalPaneheaderText);
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
          InventoryInstances.waitContentLoading();

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcAuthFileM2);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(testData.marcAuthFileM2);

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.sharedMarcAuthValue);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(
            `Shared${testData.sharedMarcAuthValue}`,
          );
        },
      );
    });
  });
});
