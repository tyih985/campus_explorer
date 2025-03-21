import { Request, Response } from "express";
import { Log } from "@ubccpsc310/project-support";
import { StatusCodes } from "http-status-codes";
import { IInsightFacade } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

export class Get {
	private static facade: IInsightFacade = new InsightFacade();

	public static async listDatasets(req: Request, res: Response): Promise<void> {
		Log.info(`Server::listDatasets(..)`);
		const response = await Get.facade.listDatasets();
		res.status(StatusCodes.OK).json({ result: response });
	}
}
