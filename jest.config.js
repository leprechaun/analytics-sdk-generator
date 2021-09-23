/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: [
    'default', // keep the default reporter
      [
        'jest-xunit',
        {
          outputPath: "./coverage",
          traitsRegex: [
            { regex: /\(Test Type:([^,)]+)(,|\)).*/g, name: 'Category' },
            { regex: /.*Test Traits: ([^)]+)\).*/g, name: 'Type' }
          ]
        }
      ]
  ]
};
