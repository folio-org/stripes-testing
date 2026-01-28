import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DateTools from '../../../../support/utils/dateTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../support/fragments/data_import/dataImport';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: 'AT_C663320_MarcAuthority',
        searchOption: 'Keyword',
        tagLdr: 'LDR',
        tag008: '008',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };
      const dropdownUpdate = [testData.tagLdr, 'Status', 'n - New'];
      const textUpdate = ['Geo Subd', 'd'];
      const versionHistoryCardsData = [
        {
          isOriginal: false,
          isCurrent: true,
          changes: [
            { text: 'Field 008', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        { isOriginal: true, isCurrent: false },
      ];
      const changesModalData = [
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: testData.tag008,
          from: '801007n| azannaabn          |b aaa      ',
          to: '801007d| azannaabn          |b aaa      ',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: 'LDR',
          from: /^\d{5}c[a-z].{3}\d{7}.{3}4500$/,
          to: /^\d{5}n[a-z].{3}\d{7}.{3}4500$/,
        },
      ];
      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];
      const marcFile = {
        marc: 'marcAuthFileC663320.mrc',
        fileName: `testMarcFileC663320_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C663320');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminUserDetails().then((user) => {
            testData.adminLastName = user.personal.lastName;
            testData.adminFirstName = user.personal.firstName;

            versionHistoryCardsData.forEach((cardData, index) => {
              if (index === versionHistoryCardsData.length - 1) {
                cardData.firstName = testData.adminFirstName;
                cardData.lastName = testData.adminLastName;
              } else {
                cardData.firstName = userProperties.firstName;
                cardData.lastName = userProperties.lastName;
              }
            });
          });

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].authority.id;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663320 Check "Version history" pane after Update of "LDR" and "008" fields in "MARC authority" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C663320'] },
        () => {
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.edit();
          QuickMarcEditor.selectFieldsDropdownOption(...dropdownUpdate);
          QuickMarcEditor.verifyDropdownOptionChecked(...dropdownUpdate);
          QuickMarcEditor.update008TextFields(...textUpdate);
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.authorityHeading);

          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(versionHistoryCardsData.length);
          versionHistoryCardsData.forEach((cardData, index) => {
            VersionHistorySection.verifyVersionHistoryCard(
              index,
              testData.date,
              cardData.firstName,
              cardData.lastName,
              cardData.isOriginal,
              cardData.isCurrent,
            );
            if (cardData.changes) {
              cardData.changes.forEach((change) => {
                VersionHistorySection.checkChangeForCard(index, change.text, change.action);
              });
              VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
            }
          });

          VersionHistorySection.openChangesForCard();
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          changesModalData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(changesModalData.length);
        },
      );
    });
  });
});
