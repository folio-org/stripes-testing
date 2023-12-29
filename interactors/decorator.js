import HTML from './baseHTML';

const label = (el) => el.querySelector('label')?.textContent;

export const Decorator = HTML.extend('decorator')
  .selector('[class^=decorator-]')
  .locator((el) => el.querySelector('[class^=headline-]')?.textContent);

export const DecoratorWrapper = HTML.extend('decorator wrapper')
  .selector('[class^=decoratorWrapper-]')
  .locator(label)
  .filters({
    label,
  });
