# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for
commit guidelines.

## [0.5.0](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.9...v0.5.0) (2021-07-02)

### Features

- 类型检查工具从 flow 切换为 ts
  ([d01909e](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/d01909e742ede64904087f9010b581d33c1ca60f))
- 启用 mock,只需要给请求头添加 mock-response 即可
  ([6a58aab](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/6a58aab23572ae205e7ac133ef59456604e2002b))

### Bug Fixes

- tsc 编译问题 ([3b9c79f](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/3b9c79f8712dac153af3ab98a27e0ad85ab1eda1))

### [0.4.7](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.6...v0.4.7) (2021-06-29)

### Features

- 增加更新策略图 ([18b06f4](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/18b06f44398823cc314e3d316dc2b49bd7a28d65))

### [0.4.6](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.5...v0.4.6) (2021-06-16)

### Bug Fixes

- 更新 response body 使用了错误的数据
  ([3a3686c](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/3a3686c1be23c0d006bcf137552c2c33a21c8c3b))

### [0.4.5](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.4...v0.4.5) (2021-06-16)

### [0.4.4](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.3...v0.4.4) (2021-06-15)

### Bug Fixes

- 追加 ts 内容未更新 json-schema 的问题
  ([5924e70](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/5924e701f2239352a83ad77e44723846183d54bd))

### [0.4.3](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.2...v0.4.3) (2021-06-15)

### Features

- 追加策略调整为有 latest 的字符则不再追加内容
  ([44a2785](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/44a2785a69a9ae9cc2c16f7433d908c79d11b086))

### [0.4.2](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.1...v0.4.2) (2021-06-15)

### [0.4.1](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.4.0...v0.4.1) (2021-06-15)

### Features

- 去掉表格样式的日志,增加忽略 url 的配置
  ([3223a6c](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/3223a6cebe52a833dd68929ab9a16dd792996b90))

## [0.4.0](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.3.2...v0.4.0) (2021-06-11)

### [0.3.2](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.3.1...v0.3.2) (2021-06-11)

### Features

- 整理结构 ([0fdc414](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/0fdc414f4a89ce482d98d987506227c81c23b98b))
- 支持两种更新策略,覆盖或追加 ([9da0158](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/9da015875d30b9e1bad95e43bdddbe9ca0dc69bf))
- differ 针对请求和响应 ([1c7e42a](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/1c7e42a10999f0598b577f73af0b72c09e527b0c))
- mock ([e7638d2](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/e7638d28843350d96ea60b07bab21d4cb32ced99))

### [0.3.1](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.0.4...v0.3.1) (2021-06-09)

### [0.0.4](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.0.3...v0.0.4) (2021-06-09)

### [0.0.3](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/compare/v0.0.2...v0.0.3) (2021-06-09)

### Features

- 默认配置 diff ([33cf90b](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/33cf90b14d635c81198921a12cc5cd49117ca456))
- 配置文件更名,默认配置修改 ([3f33696](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/3f336969bac8e963a6b79ccfc5d1db49dedd2e3b))
- 引入 ajv 校验 jsonschema ([28ab7d6](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/28ab7d6e8849d92fca77390c612ee54000b0ed96))

### 0.0.2 (2021-06-09)

### Features

- 将保存请求参数的逻辑置于 diff 请求响应之后
  ([3f92709](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/3f9270969ceb42242005db4e258813702d3d3d53))
- 日志梳理 ([1ba5aeb](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/1ba5aeb57351a1342d75be21c9ecdafb114a4f3e))
- 日志优化 ([72c2c8b](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/72c2c8b457e2d2a340d76acd1a640bfce6362219))
- 梳理逻辑 ([ccbc4cd](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/ccbc4cd76713cd150d39be6b6abb9b679ba93ba1))
- 支持自定义文件路径 ([75fb3ff](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/75fb3ffaa423083fda5af1ec655491ec0780408a))
- log 优化 ([8c9a699](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/8c9a699440a2d32ea332602176ce3f9e1fd0b529))
- support command ([beffab8](http://gitlab.haochang.tv/web-frontend/API-types-automatic-converter/commit/beffab8d5c483b767fedbb334545778562bafa70))
