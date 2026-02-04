import { recurse } from 'cypress-recurse';
import {
  Button,
  ListItem,
  Section,
  PaneHeader,
  including,
  List,
  Link,
} from '../../../../interactors';
import EHoldingsTitle from './eHoldingsTitle';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomTitle from './eHoldingsNewCustomTitle';

const resultSection = Section({ id: 'search-results' });
const searchResultsList = resultSection.find(List({ testId: 'scroll-view-list' }));

export default {
  waitLoading: () => {
    cy.expect(resultSection.find(PaneHeader('Loading...')).absent());
    cy.expect(
      resultSection
        .find(ListItem({ className: including('list-item-'), index: 0 }).find(Button()))
        .exists(),
    );
  },
  verifyListOfExistingPackagesIsDisplayed: () => {
    cy.expect(resultSection.find(List()).exists());
  },
  getFilteredTitlesList() {
    cy.then(() => searchResultsList.links()).then((links) => {
      const prefix = 'data-test-eholdings-title-list-item';
      const filteredTitles = (links?.length ? [...links] : []).map((link) => {
        return {
          id: link.getAttribute('href').replace('/eholdings/titles/', ''),
          name: link.querySelector(`[${prefix}-title-name="true"]`).innerText,
        };
      });

      cy.wrap(filteredTitles).as('filteredTitles');
    });

    return cy.get('@filteredTitles');
  },
  openTitlePackagesView({ titleId, titleName }) {
    cy.do(
      searchResultsList.find(Link({ href: including(`/eholdings/titles/${titleId}`) })).click(),
    );
    EHoldingsTitle.waitLoading(titleName);

    return EHoldingsTitle;
  },
  openTitle: (rowNumber = 1) => {
    const specialRow = resultSection.find(
      ListItem({ className: including('list-item-'), index: rowNumber }),
    );

    cy.then(() => specialRow.h3Value()).then((title) => {
      cy.do(specialRow.find(Button()).click());
      EHoldingsTitle.waitLoading(title);
    });
  },
  create: (packageName, titleName = `title_${getRandomPostfix()}`) => {
    cy.do(resultSection.find(Button({ href: '/eholdings/titles/new' })).click());
    eHoldingsNewCustomTitle.fillInRequiredProperties(packageName, titleName);
    eHoldingsNewCustomTitle.saveAndClose();
    return titleName;
  },
  createWhenNotEnglishSession: (packageName, titleName = `title_${getRandomPostfix()}`) => {
    cy.do(resultSection.find(Button({ href: '/eholdings/titles/new' })).click());
    eHoldingsNewCustomTitle.fillInRequiredPropertiesWhenNotEnglishSession(packageName, titleName);
    eHoldingsNewCustomTitle.saveAndClose();
    return titleName;
  },
  getSelectedNotCustomTitleViaApi: (subject) => {
    cy.okapiRequest({
      path: 'eholdings/titles',
      searchParams: {
        'filter[selected]': true,
        searchfield: subject,
        'filter[subject]': subject,
        'filter[custom]': false,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      const initialTitles = body.data
        .filter((specialTitle) => specialTitle?.attributes?.name)
        .map((title) => ({ id: title.id, name: title.attributes.name }));
      cy.wrap([...new Set(initialTitles)][1]).as('title');
    });
    return cy.get('@title');
  },
  getEHoldingsTitlesViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'eholdings/titles',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },

  createEHoldingTitleVIaApi({ packageId, titleName = `AT_Title_${getRandomPostfix()}` }) {
    const payload = {
      data: {
        type: 'titles',
        attributes: {
          contributors: [],
          description: '',
          edition: '',
          identifiers: [],
          isPeerReviewed: false,
          name: titleName,
          publicationType: 'Unspecified',
          publisherName: '',
        },
      },
      included: [
        {
          type: 'resource',
          attributes: {
            packageId,
          },
        },
      ],
    };

    return cy
      .okapiRequest({
        method: 'POST',
        path: 'eholdings/titles',
        body: payload,
        contentTypeHeader: 'application/vnd.api+json',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return recurse(
          () => this.getEHoldingsTitlesByTitleNameViaApi({ titleName }),
          (titlesBody) => titlesBody.data.length > 0,
          {
            timeout: 60_000,
            delay: 1_000,
          },
        ).then(() => {
          return response.body.data;
        });
      });
  },

  getEHoldingsTitlesByTitleNameViaApi({ titleName, include = 'resources' }) {
    return this.getEHoldingsTitlesViaApi({ 'filter[name]': titleName, include });
  },

  verifyTitleFound(titleName) {
    cy.expect(
      resultSection
        .find(ListItem({ className: including('list-item-'), h3Value: titleName }))
        .exists(),
    );
  },
};
