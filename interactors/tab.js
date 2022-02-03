import { HTML } from '@interactors/html';

export const TabList = HTML.extend('tab list')
  .selector('[role="tablist"]')
  .filters({
    ariaLabel: el => el.ariaLabel,
    tabsLength: el => el.querySelectorAll('li').length
  });

export const Tab = HTML.extend('tab')
  .locator(el => el.textContent)
  .selector('[role="tab"]');

export const TabPanel = HTML.extend('tab panel')
  .locator(el => el.textContent)
  .selector('[role="tabpanel"]');
