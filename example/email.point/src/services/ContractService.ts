const windowWithPoint = window as unknown as WindowWithPoint;

type ContractCallParams = {
  contract: string;
  method: string;
  params?: any[];
};

export async function callContract({ contract, method, params }: ContractCallParams): Promise<any> {
  const { data } = await windowWithPoint.point.contract.call({
    contract,
    method,
    params,
  });
  return data;
}

export async function sendContract({ contract, method, params }: ContractCallParams): Promise<any> {
  const response = await windowWithPoint.point.contract.send({
    contract,
    method,
    params,
  });
  return response;
}
