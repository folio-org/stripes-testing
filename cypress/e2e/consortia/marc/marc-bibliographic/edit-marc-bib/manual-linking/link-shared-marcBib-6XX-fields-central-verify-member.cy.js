import { including } from '@interactors/html';

import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import { Permissions } from '../../../../../../support/dictionary';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../../support/fragments/topMenu';
import Users from '../../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          fields: {
            tag600: {
              tag: '600',
              rowIndex: 45,
              browseSearchOption: 'nameTitle',
              browseSearchQuery:
                'Black Panther Numeration (Fictitious character) second title Dates associated with a name Miscellaneous information Attribution qualifier Fuller form of name Date of a work Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Wakanda Forever Form subdivision General subdivision Chronological subdivision Geographic subdivision',
              authorityHeading:
                'Black Panther Numeration (Fictitious character) Dates associated with a name second title Date of a work Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Fuller form of name Key for music Version Wakanda Forever',
              ind1: '0',
              ind2: '0',
              controlled:
                '$a Black Panther $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              eSubfield: '$e Relator term',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2016004082',
              seventhBox: '$4 .prt $2 test',
            },
            tag610: {
              tag: '610',
              rowIndex: 46,
              browseSearchOption: 'nameTitle',
              browseSearchQuery:
                'Radio Roma. Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work Form subdivision General subdivision Chronological subdivision Geographic subdivision',
              authorityHeading:
                'Radio Roma. Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work',
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Radio Roma. $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              eSubfield: '$e Relator term $u Affiliation',
              zeroSubfield: '$0 4510955',
              seventhBox: '',
            },
            tag611: {
              tag: '611',
              rowIndex: 47,
              browseSearchOption: 'nameTitle',
              browseSearchQuery:
                'Roma Council Location of meeting Date Subordinate unit Date of a work Inf Medium Form subheading Language of a work Nou Name of meeting following jurisdiction name entry element Name of part/section of a work Version Title of a work',
              authorityHeading:
                'Roma Council Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Number of part/section/meeting Name of part/section of a work Name of meeting following jurisdiction name entry element Version Title of a work',
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Roma Council $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work',
              eSubfield:
                '$b Subordinate unit $m Moo $o Opps $r right $u Date of meeting or treaty signing $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n79084170',
              seventhBox: '',
            },
            tag630: {
              tag: '630',
              rowIndex: 48,
              browseSearchOption: 'uniformTitle',
              browseSearchQuery:
                'Marvel comics Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work',
              authorityHeading:
                'Marvel comics Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work Form subdivision General subdivision Chronological subdivision Geographic subdivision',
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work',
              eSubfield:
                '$e Term $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n80026955',
              seventhBox: '',
            },
            tag650: {
              tag: '650',
              rowIndex: 49,
              browseSearchOption: 'subject',
              browseSearchQuery: 'Speaking Oratory',
              authorityHeading: 'Speaking Oratory',
              ind1: '\\',
              ind2: '\\',
              controlled: '$a Speaking Oratory',
              eSubfield:
                '$b debating $c Location $d Date $e Term $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/subjects/sh85095298',
              seventhBox: '',
            },
            tag651: {
              tag: '651',
              rowIndex: 50,
              browseSearchOption: 'geographicName',
              browseSearchQuery: 'Clear Creek (Tex.)',
              authorityHeading: 'Clear Creek (Tex.)',
              ind1: '\\',
              ind2: '\\',
              controlled: '$a Clear Creek (Tex.)',
              eSubfield:
                '$e Term $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n79041363',
              seventhBox: '$4 Test',
            },
            tag655: {
              tag: '655',
              rowIndex: 51,
              browseSearchOption: 'genre',
              browseSearchQuery:
                'Drama Form subdivision General subdivision Chronological subdivision Geographic subdivision',
              authorityHeading:
                'Drama Form subdivision General subdivision Chronological subdivision Geographic subdivision',
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Drama $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              eSubfield: '$b Bowl $c Chicken',
              zeroSubfield: '$0 http://id.loc.gov/authorities/genreForms/gf2014026297',
              seventhBox: '$7 Luck',
            },
          },
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC770439.mrc',
            fileName: `testMarcFileC770439.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC770439.mrc',
            fileName: `testMarcAuthFileC770439.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
        ];

        // ruleId mapping: 8→600, 9→610, 10→611, 11→630, 12→650, 13→651, 14→655
        const authoritySubfieldsCentral = [
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

        const authoritySubfieldsMember = [
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
            ],
          },
          {
            ruleId: '10',
            ruleSubfields: [
              'a',
              'c',
              'e',
              'q',
              'f',
              'h',
              'k',
              'l',
              'p',
              's',
              't',
              'd',
              'g',
              'n',
              'v',
              'x',
              'y',
              'z',
            ],
          },
          {
            ruleId: '11',
            ruleSubfields: ['a'],
          },
          {
            ruleId: '12',
            ruleSubfields: ['a', 'b', 'g', 'v', 'x', 'y', 'z'],
          },
          {
            ruleId: '13',
            ruleSubfields: ['a', 'g', 'v', 'x', 'y', 'z'],
          },
          {
            ruleId: '14',
            ruleSubfields: ['a'],
          },
        ];

        const createdRecordIDs = [];
        const users = {};

        before('Create user, import data', () => {
          cy.getAdminToken();

          // Set linking subfields on Central tenant
          authoritySubfieldsCentral.forEach(({ ruleId, ruleSubfields }) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields);
          });

          // Set linking subfields on Member tenant
          cy.setTenant(Affiliations.College);
          authoritySubfieldsMember.forEach(({ ruleId, ruleSubfields }) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields);
          });
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
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
            })
            .then(() => {
              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Restore default linking subfields on Central tenant
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          // Restore default linking subfields on Member tenant
          cy.setTenant(Affiliations.College);
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.slice(1).forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C770439 ECS | Link 6XX "MARC Bib" fields with "MARC Authority" records on Central tenant, verify linked fields remain in Member tenant (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C770439'] },
          () => {
            // Step 1: Open MARC bib record from Inventory on Central tenant
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            // Step 2: Link 600 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag600.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag600.browseSearchOption,
              testData.fields.tag600.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(`Shared\n${testData.fields.tag600.authorityHeading}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag600.tag,
              testData.fields.tag600.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );

            // Step 4: Link 610 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag610.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag610.browseSearchOption,
              testData.fields.tag610.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(`Shared\n${testData.fields.tag610.authorityHeading}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag610.tag,
              testData.fields.tag610.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );

            // Step 6: Link 611 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag611.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag611.browseSearchOption,
              testData.fields.tag611.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(`Shared\n${testData.fields.tag611.authorityHeading}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag611.tag,
              testData.fields.tag611.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );

            // Step 8: Link 630 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag630.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag630.browseSearchOption,
              testData.fields.tag630.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(`Shared\n${testData.fields.tag630.authorityHeading}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag630.tag,
              testData.fields.tag630.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );

            // Step 10: Link 650 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag650.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag650.browseSearchOption,
              testData.fields.tag650.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(
              including(`Shared\n${testData.fields.tag650.authorityHeading}`),
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag650.tag,
              testData.fields.tag650.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );

            // Step 12: Link 651 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag651.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag651.browseSearchOption,
              testData.fields.tag651.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(
              including(`Shared\n${testData.fields.tag651.authorityHeading}`),
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag651.tag,
              testData.fields.tag651.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );

            // Step 14: Link 655 field
            QuickMarcEditor.clickLinkIconInTagField(testData.fields.tag655.rowIndex);
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.fields.tag655.browseSearchOption,
              testData.fields.tag655.browseSearchQuery,
              'Browse',
            );
            MarcAuthorities.selectTitle(`Shared\n${testData.fields.tag655.authorityHeading}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.fields.tag655.tag,
              testData.fields.tag655.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );

            // Step 16: Click "Save & keep editing"
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();

            // Verify all 6XX fields remain linked after save & keep editing
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );

            // Step 17: Switch active affiliation to Member tenant
            QuickMarcEditor.closeEditorPane();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 18: Find the linked MARC bib record in Member tenant
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 19: Edit MARC bib on Member tenant and verify all 6XX fields remain linked
            InventoryInstance.editMarcBibliographicRecord();

            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );
          },
        );
      });
    });
  });
});
