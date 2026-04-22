export type TaskSystemTaskResponse = {
  id: string | number;
  proposalid?: string;
  proposalname?: string;
  proposaltype?: string;
  proposalstatusdetail?: string;
  system?: string;
  env?: string;
  taskjobid?: string;
  testmanager?: string;
  starttime?: string;
  endtime?: string;
  completed?: string | number | boolean | null;
};

export type TaskSummary = {
  id: string;
  proposalId: string;
  proposalName: string;
  proposalType: string;
  proposalStatusDetail: string;
  system: string;
  env: string;
  taskJobId: string;
  testManager: string;
  startTime: string;
  endTime: string;
  completed: boolean;
};

export type TaskSystemCredentials = {
  baseUrl: string;
  loginName: string;
  loginPwd: string;
};

export type TaskSystemSession = {
  token: string;
};

export type TaskSystemVerificationCode = {
  uuid: string;
  realcode: string;
};

export type TaskSystemTaskQueryBody = {
  startDeploytime: string;
  endDeploytime: string;
  endOnlinedate: string;
  startOnlinedate: string;
  actualName: string;
  filterType: string;
  pageNum: number;
  pageSize: number;
  proposal: string;
  searchCount: boolean;
  taskjobid: string;
  titletype: string;
};
