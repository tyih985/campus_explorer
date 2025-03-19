import { Request, Response } from "express";
import { Log } from "@ubccpsc310/project-support";
import { StatusCodes } from "http-status-codes";
import { IInsightFacade, InsightDatasetKind } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

export class Put {
	private static facade: IInsightFacade = new InsightFacade();

	public static async addDataset(req: Request, res: Response): Promise<void> {
		try {
			Log.info(`Server::dataset(..) - params: ${JSON.stringify(req.params)}`);
			Put.validateKind(req.params.kind);
			const response = await Put.performAdd(req.params.id, req.params.kind, req.body);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static validateKind(kind: any): void {
		if (!Object.values(InsightDatasetKind).includes(kind)) {
			throw new Error("Invalid dataset kind");
		}
	}

	private static async performAdd(id: string, kind: any, zip: any): Promise<string[]> {
		const datasetKind: InsightDatasetKind = kind;
		const dataset = Put.convertToBase64(zip);
		return await Put.facade.addDataset(id, dataset, datasetKind);
	}

	private static convertToBase64(file: any): string {
		return file.toString("base64");
	}
}
