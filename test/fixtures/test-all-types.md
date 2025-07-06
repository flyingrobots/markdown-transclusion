# Template Variable Type Tests

Testing all supported variable types:

## String Values
- Title: {{title}}
- Author: {{author}}

## Number Values
- Count: {{count}}
- Price: ${{price}}
- Year: {{year}}
- NaN: {{notANumber}}
- Infinity: {{infinity}}

## Boolean Values
- Published: {{published}}
- Draft: {{draft}}
- Active: {{active}}

## Null and Undefined
- Deleted By: {{deletedBy}}
- Optional Field: {{optional}}
- Missing Field: {{missingField}}

## Date Values
- Created Date: {{createdDate}}
- Modified Date: {{modifiedDate}}
- Custom Date: {{customDate}}

## Function Values
- Dynamic Count: {{dynamicCount}}
- Current Time: {{currentTime}}
- Random ID: {{randomId}}
- Throws Error: {{throwsError}}

## Edge Cases
- Object: {{objectValue}}
- Array: {{arrayValue}}
- Symbol: {{symbolValue}}

## Unmatched Variables
- This should remain: {{unknownVariable}}
- And this: {{anotherUnknown}}