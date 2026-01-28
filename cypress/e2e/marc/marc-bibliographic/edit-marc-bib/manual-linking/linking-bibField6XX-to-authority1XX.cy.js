import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          calloutUpdatedRecord:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC377026.mrc',
            fileName: `testMarcFileC377026${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC377026.mrc',
            fileName: `testMarcFile377026.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C377026Black Panther (Fictitious character) Wakanda Forever',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        const authoritySubfieldsToUpdateViaApi = [
          {
            ruleId: '8',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'j',
              'q',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
              'v',
              'x',
              'y',
              'z',
            ],
          },
          {
            ruleId: '9',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
              'v',
              'x',
              'y',
              'z',
            ],
          },
          {
            ruleId: '10',
            ruleSubfields: ['a', 'c', 'e', 'q', 'f', 'h', 'k', 'l', 'p', 's', 't', 'd', 'g', 'n'],
          },
          {
            ruleId: '11',
            ruleSubfields: ['a', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't'],
          },
          {
            ruleId: '12',
            ruleSubfields: ['a'],
          },
          {
            ruleId: '13',
            ruleSubfields: ['a'],
          },
          {
            ruleId: '14',
            ruleSubfields: ['a', 'v', 'x', 'y', 'z'],
          },
        ];

        const bib6XXAfterLinkingToAuth1XX = [
          {
            browseSearchOption: 'personalNameTitle',
            browseValue: 'C377026 Black Panther Dates associated with a name Wakanda Forever',
            searchValue: 'C377026 Black Panther Numeration (Fictitious character) Dates',
            rowIndex: 45,
            tagValue: '600',
            secondBox: '0',
            thirdBox: '0',
            fourthBox:
              '$a C377026 Black Panther $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$e Relator term',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n2016004082',
            seventhBox: '$4 .prt $2 test',
          },
          {
            browseSearchOption: 'corporateNameTitle',
            browseValue: 'C377026 Radio Roma. Date of meeting or treaty signing Title of a work',
            searchValue: 'C377026 Radio Roma. Hrvatski program Location of meeting Date',
            rowIndex: 46,
            tagValue: '610',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a C377026 Radio Roma. $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$e Relator term $u Affiliation',
            sixthBox: '$0 4510955',
            seventhBox: '',
          },
          {
            browseSearchOption: 'corporateNameTitle',
            browseValue: 'C377026 Roma Council Date Title of a work',
            searchValue: 'C377026 Roma Council Location of meeting Date of meeting',
            rowIndex: 47,
            tagValue: '611',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a C377026 Roma Council $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work',
            fifthBox:
              '$b Subordinate unit $m Moo $o Opps $r right $u Date of meeting or treaty signing $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n79084170',
            seventhBox: '',
          },
          {
            browseSearchOption: 'uniformTitle',
            browseValue: 'C377026 Marvel comics Date of treaty signing Title of a work',
            searchValue: 'C377026 Marvel comics Date of treaty signing Date',
            rowIndex: 48,
            tagValue: '630',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a C377026 Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work',
            fifthBox:
              '$e Term $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n80026955',
            seventhBox: '',
          },
          {
            browseSearchOption: 'subject',
            browseValue: 'C377026 Speaking Oratory Date',
            searchValue: 'C377026 Speaking Oratory debating Form subdivision',
            rowIndex: 49,
            tagValue: '650',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Speaking Oratory',
            fifthBox:
              '$b debating $c Location $d Date $e Term $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/subjects/sh85095298',
            seventhBox: '',
          },
          {
            browseSearchOption: 'geographicName',
            browseValue: 'C377026 Clear Creek (Tex.)',
            searchValue: 'C377026 Clear Creek (Tex.) Place in Texas Form subdivision',
            rowIndex: 50,
            tagValue: '651',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Clear Creek (Tex.)',
            fifthBox:
              '$e Term $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n79041363',
            seventhBox: '$4 Test',
          },
          {
            browseSearchOption: 'genre',
            browseValue: 'C377026 Drama',
            searchValue: 'C377026 Drama Form subdivision General subdivision',
            rowIndex: 51,
            tagValue: '655',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a C377026 Drama $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$b Bowl $c Chicken',
            sixthBox: '$0 http://id.loc.gov/authorities/genreForms/gf2014026297',
            seventhBox: '$7 Luck',
          },
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C377026');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.getAdminToken();
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
            authoritySubfieldsToUpdateViaApi.forEach((tag) => {
              QuickMarcEditor.setAuthoritySubfieldsViaApi(tag.ruleId, tag.ruleSubfields);
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C377026 Link "Subjects" fields (with all subfields) when MARC authority 1XXs have all subfields and different subfields selected as linkable in config (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C377026'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              InventoryInstance.verifyAndClickLinkIcon(field.tagValue);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(field.searchValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(field.tagValue);
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });

            QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutUpdatedRecord);
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });
          },
        );
      });
    });
  });
});
