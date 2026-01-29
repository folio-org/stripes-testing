import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'Keyword',
      marcAuthIcon: 'Linked to MARC authority',
      authorityType: 'Auth/Ref',
      searchAuthorityQueries: ['C374148 Feminist poetry', 'C374148 Chin, Staceyann, 1972-'],
      recordsLinkingData: [
        {
          linkingBibFieldTag: '650',
          authorityTitle: 'C374148 Feminist poetry',
          authorityLinkedFieldTag: '150',
          authorityFieldValue: 'C374148 Feminist poetry',
        },
        {
          linkingBibFieldTag: '100',
          authorityTitle: 'C374148 Chin, Staceyann, 1972-',
          authorityLinkedFieldTag: '100',
          authorityFieldValue: '$a C374148 Chin, Staceyann, $d 1972-',
        },
      ],
      linked100FieldValues: [
        11,
        '100',
        '1',
        '\\',
        '$a C374148 Chin, Staceyann, $d 1972-',
        '$e Author $e Narrator',
        '$0 http://id.loc.gov/authorities/names/n2008052404',
        '$1 http://viaf.org/viaf/24074052',
      ],
      notLinked650FieldValues: [
        19,
        '650',
        '\\',
        '0',
        '$a C374148 Feminist poetry $0 http://id.loc.gov/authorities/subjects/sh85047755',
      ],
      deleteModalMessage:
        'Are you sure you want to permanently delete the authority record:  C374148 Poetry ? If you proceed with deletion, then 1 linked bibliographic record will retain authorized value and will become uncontrolled.',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC374148.mrc',
        fileName: `C374148 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        instanceTitle: 'Crossfire : a litany for survival.',
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC374148_01.mrc',
        fileName: `C374148 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileForC374148_02.mrc',
        fileName: `C374148 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
        authorutyTitle: 'C374148 Poetry',
      },
    ];

    const createdRecordIDs = [];

    before('Create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
        .then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          testData.searchAuthorityQueries.forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id, true);
                });
              }
            });
          });

          marcFiles.forEach((marcFile) => {
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
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            testData.recordsLinkingData.forEach((authorityField) => {
              InventoryInstance.verifyAndClickLinkIcon(authorityField.linkingBibFieldTag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.switchToSearch();
              InventoryInstance.searchResults(authorityField.authorityTitle);
              MarcAuthorities.checkFieldAndContentExistence(
                authorityField.authorityLinkedFieldTag,
                authorityField.authorityFieldValue,
              );
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(authorityField.linkingBibFieldTag);
              QuickMarcEditor.closeCallout();
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });
        })
        .then(() => {
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C374148 Delete auth/ref "MARC Authority" record that has one linked field in "MARC Bib" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C374148'] },
      () => {
        MarcAuthorities.searchByParameter(testData.searchOption, marcFiles[2].authorutyTitle);

        MarcAuthorities.selectItem(marcFiles[2].authorutyTitle, false);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.checkDeleteModalMessage(testData.deleteModalMessage);

        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.verifyDeleteComplete(marcFiles[2].authorutyTitle);

        TopMenuNavigation.navigateToApp('Inventory');
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();

        InventoryInstance.editMarcBibliographicRecord();

        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100FieldValues);
        QuickMarcEditor.verifyTagFieldNotLinked(...testData.notLinked650FieldValues);

        QuickMarcEditor.verifyAllBoxesInARowAreEditable(
          testData.recordsLinkingData[0].linkingBibFieldTag,
        );

        QuickMarcEditor.pressCancel();

        InventoryInstance.viewSource();
        InventoryViewSource.contains(
          `${testData.marcAuthIcon}\n\t${testData.recordsLinkingData[1].linkingBibFieldTag}\t`,
        );
        InventoryViewSource.notContains(
          `${testData.marcAuthIcon}\n\t${testData.recordsLinkingData[0].linkingBibFieldTag}\t`,
        );
      },
    );
  });
});
