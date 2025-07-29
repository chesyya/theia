// 在现有的绑定中添加
bind(PluginAuthorizationService).toService(PluginAuthorizationServiceProxy);
bind(PluginAuthorizationStatus).toSelf().inSingletonScope();
bind(FrontendApplicationContribution).toService(PluginAuthorizationStatus);
