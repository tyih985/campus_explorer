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
			const response = await Put.facade.addDataset(
				req.params.id,
				Put.convertToBase64(req.body),
				req.params.kind as InsightDatasetKind
			);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: (err as Error).message });
		}
	}

	private static validateKind(kind: any): void {
		if (!Object.values(InsightDatasetKind).includes(kind)) {
			throw new Error("Invalid dataset kind");
		}
	}

	private static convertToBase64(file: any): string {
		return file.toString("base64");
	}
}
