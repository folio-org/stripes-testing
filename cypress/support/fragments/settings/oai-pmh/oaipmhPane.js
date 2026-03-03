import { NavListItem, Pane, Section } from '../../../../../interactors';
import Behavior from './behavior';
import Logs from './logs';

const navPaneSection = Section({ id: 'app-settings-nav-pane' });
const oaipmhPane = Pane('OAI-PMH');

export const SECTIONS = {
  GENERAL: 'General',
  TECHNICAL: 'Technical',
  BEHAVIOR: 'Behavior',
  LOGS: 'Logs',
};

const oaiPmhSections = {
  [SECTIONS.GENERAL]: {},
  [SECTIONS.TECHNICAL]: {},
  [SECTIONS.BEHAVIOR]: Behavior,
  [SECTIONS.LOGS]: Logs,
};

export default {
  waitLoading() {
    cy.expect(oaipmhPane.exists());
  },
  checkPageTitle(title) {
    cy.title().should('eq', title);
  },
  checkSectionListItems({ canViewLogs = false } = {}) {
    cy.expect(oaipmhPane.exists());

    [
      SECTIONS.GENERAL,
      SECTIONS.TECHNICAL,
      SECTIONS.BEHAVIOR,
      ...(canViewLogs ? [SECTIONS.LOGS] : []),
    ].forEach((section) => {
      if (section === SECTIONS.LOGS) {
        if (canViewLogs) {
          cy.expect(navPaneSection.find(NavListItem(section)).exists());
        } else {
          cy.expect(navPaneSection.find(NavListItem(section)).absent());
        }
      } else {
        cy.expect(navPaneSection.find(NavListItem(section)).exists());
      }
    });
  },
  selectSection(section) {
    cy.do(navPaneSection.find(NavListItem(section)).click());
    cy.expect(Pane(section).exists());
    // need to wait to prevent application error
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);

    return oaiPmhSections[section];
  },
  checkSectionListItemDoesNotExist(section) {
    cy.expect(navPaneSection.find(NavListItem(section)).absent());
  },
};
