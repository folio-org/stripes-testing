import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';

describe('eHoldings', () => {
  describe('Titles', () => {
    const testData = {
      title: 'Journal of lipid research',
      publicationType: 'Journal',
      peerReviewed: 'Yes',
      titleType: 'Managed',
    };

    before('Creating user and getting info about title', () => {
      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.userProperties = userProperties;
      });
      cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
        testData.C9240UserProperties = userProperties;
      });
      EHoldingsTitlesSearch.getViaApi({
        'filter[name]': testData.title,
        'filter[type]': testData.publicationType.toLowerCase(),
      }).then((res) => {
        testData.alternateTitles = res[0].attributes.alternateTitles
          .map((el) => el.alternateTitle)
          .join('; ');
        testData.ISSNPrint = res[0].attributes.identifiers.filter(
          (el) => el.type === 'ISSN' && el.subtype === 'Print',
        )[0].id;
        testData.ISSNOnline = res[0].attributes.identifiers.filter(
          (el) => el.type === 'ISSN' && el.subtype === 'Online',
        )[0].id;
        testData.publisher = res[0].attributes.publisherName;
        testData.subjects = res[0].attributes.subjects[0].subject;
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C360543 Check the content of "Title information" accordion in "Title" detail record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360543'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.C9240UserProperties.username, testData.C9240UserProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          cy.reload();
          EHoldingsTitlesSearch.waitLoading();
        }, 20_000);

        cy.visit(`${TopMenu.eholdingsPath}/titles/41327`);
        EHoldingsTitle.waitLoading(testData.title);
        EHoldingsTitle.checkTitleInformationField('Alternate title(s)', testData.alternateTitles);
        EHoldingsTitle.checkTitleInformationField('Publication type', testData.publicationType);
        EHoldingsTitle.checkTitleInformationField('ISSN (Print)', testData.ISSNPrint);
        EHoldingsTitle.checkTitleInformationField('ISSN (Online)', testData.ISSNOnline);
        EHoldingsTitle.checkTitleInformationField('Publisher', testData.publisher);
        EHoldingsTitle.checkTitleInformationField('Subjects', testData.subjects);
        EHoldingsTitle.checkTitleInformationField('Peer reviewed', testData.peerReviewed);
        EHoldingsTitle.checkTitleInformationField('Title type', testData.titleType);
      },
    );
  });
});
